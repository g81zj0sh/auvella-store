import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerConfig } from "./config.server";
import {
  getAdminToken,
  SHOPIFY_SHOP_DOMAIN,
  SHOPIFY_ADMIN_API_VERSION,
} from "./orderTracking.functions";

/*
 * Review photo upload.
 *
 * Judge.me's API attaches photos through `picture_urls`, and only accepts
 * publicly fetchable URLs — base64 payloads are ignored silently. So the file
 * has to be hosted somewhere public before the review is submitted.
 *
 * We put it in Shopify Files rather than standing up an R2 bucket: the Worker
 * already holds working Admin API credentials, the result is served from
 * cdn.shopify.com (which Judge.me can always reach), and the photos land
 * somewhere Joshua can see and delete them in Shopify admin.
 *
 * Requires the `write_files` scope on the Dev Dashboard app version.
 *
 * This endpoint is reachable by anyone, so it is deliberately narrow: image
 * MIME types only, one file per call, 6 MB cap, and the extension is derived
 * from the MIME type rather than trusting the supplied filename.
 */

const MAX_BYTES = 6 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

export type PhotoUploadResult = { ok: true; url: string } | { ok: false; reason: string };

const STAGED_UPLOAD = `
  mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      stagedTargets { url resourceUrl parameters { name value } }
      userErrors { message }
    }
  }
`;

const FILE_CREATE = `
  mutation fileCreate($files: [FileCreateInput!]!) {
    fileCreate(files: $files) {
      files { id fileStatus ... on MediaImage { image { url } } }
      userErrors { message }
    }
  }
`;

const FILE_STATUS = `
  query fileStatus($id: ID!) {
    node(id: $id) { ... on MediaImage { fileStatus image { url } } }
  }
`;

async function admin(token: string, query: string, variables: unknown) {
  const res = await fetch(
    `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_ADMIN_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
      body: JSON.stringify({ query, variables }),
    },
  );
  if (!res.ok) throw new Error(`admin ${res.status}`);
  return res.json();
}

export const uploadReviewPhoto = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      mimetype: z.string().max(60),
      // data URL or bare base64; size is checked after decoding
      data: z.string().max(9_000_000),
    }),
  )
  .handler(async ({ data: input }): Promise<PhotoUploadResult> => {
    const ext = ALLOWED[input.mimetype.toLowerCase()];
    if (!ext) return { ok: false, reason: "That file type isn't supported — use a JPG, PNG or WEBP." };

    const b64 = input.data.includes(",") ? input.data.slice(input.data.indexOf(",") + 1) : input.data;
    let bytes: Uint8Array;
    try {
      const bin = atob(b64);
      bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    } catch {
      return { ok: false, reason: "That image couldn't be read — try another one." };
    }
    if (bytes.byteLength === 0) return { ok: false, reason: "That image was empty." };
    if (bytes.byteLength > MAX_BYTES) return { ok: false, reason: "That image is over 6MB — try a smaller one." };

    const cfg = getServerConfig();
    let token: string | null;
    try {
      token = await getAdminToken(cfg);
    } catch {
      return { ok: false, reason: "Photo upload isn't available right now." };
    }
    if (!token) return { ok: false, reason: "Photo upload isn't switched on yet." };

    const filename = `review-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    try {
      // 1. ask Shopify where to put it
      const staged = await admin(token, STAGED_UPLOAD, {
        input: [
          {
            filename,
            mimeType: input.mimetype,
            resource: "IMAGE",
            httpMethod: "POST",
            fileSize: String(bytes.byteLength),
          },
        ],
      });
      const target = staged?.data?.stagedUploadsCreate?.stagedTargets?.[0];
      if (!target?.url) return { ok: false, reason: "Couldn't start the upload — please try again." };

      // 2. push the bytes to the staged target
      const form = new FormData();
      for (const p of target.parameters ?? []) form.append(p.name, p.value);
      form.append("file", new Blob([bytes as BlobPart], { type: input.mimetype }), filename);
      const put = await fetch(target.url, { method: "POST", body: form });
      if (!put.ok) return { ok: false, reason: "The upload didn't complete — please try again." };

      // 3. register it as a file so it gets a CDN url
      const created = await admin(token, FILE_CREATE, {
        files: [{ originalSource: target.resourceUrl, contentType: "IMAGE", alt: "Customer review photo" }],
      });
      const file = created?.data?.fileCreate?.files?.[0];
      if (!file?.id) return { ok: false, reason: "Couldn't save the photo — please try again." };

      // 4. Shopify processes asynchronously; the CDN url only exists once READY
      let url: string | undefined = file?.image?.url;
      for (let i = 0; i < 12 && !url; i++) {
        await new Promise((r) => setTimeout(r, 700));
        const node = await admin(token, FILE_STATUS, { id: file.id });
        const n = node?.data?.node;
        if (n?.fileStatus === "FAILED") return { ok: false, reason: "That image couldn't be processed." };
        url = n?.image?.url;
      }
      if (!url) return { ok: false, reason: "The photo is still processing — submit without it, or try again." };

      return { ok: true, url: url.split("?")[0] };
    } catch {
      return { ok: false, reason: "Photo upload failed — you can still post your review without it." };
    }
  });
