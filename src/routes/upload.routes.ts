import { Router } from "express";

import multer from "multer";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { b2 } from "../config/bsClient";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router()

router.post("/", upload.single("image"), async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            res.status(400).json({ error: "Archivo no recibido" });
            return;
        }

        const originalExt = (file.originalname.split(".").pop() || "png").toLowerCase();
        const shortId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
        const fileName = `images/${shortId}.${originalExt}`;

        await b2.send(
        new PutObjectCommand({
            Bucket: process.env.B2_BUCKET_NAME,
            Key: fileName,
            Body: file.buffer,
            ContentType: file.mimetype,
            ACL: "public-read",
        })
        );

        const imageUrl = `${process.env.B2_PUBLIC_BASE_URL}/${fileName}`;

        res.json({ url: imageUrl });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Error subiendo imagen" });
    }
});

export default router;