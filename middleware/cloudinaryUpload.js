import cloudinary from "../utils/cloudinary.js";
import streamifier from "streamifier";

export const uploadUserPhotoToCloud = (req, res, next) => {
  if (!req.file) return next();

  const stream = cloudinary.uploader.upload_stream(
    {
      folder: "users",
      width: 500,
      height: 500,
      crop: "fill",
    },
    (error, result) => {
      if (error) return next(error);

      req.body.photo = result.secure_url; // 🔥 important
      next();
    },
  );

  streamifier.createReadStream(req.file.buffer).pipe(stream);
};
