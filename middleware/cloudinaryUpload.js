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

      req.body.photo = result.secure_url;
      next();
    },
  );

  streamifier.createReadStream(req.file.buffer).pipe(stream);
};

export const uploadUserProblemToCLoud = (req, res, next) => {
  if (!req.file) return next();

  const stream = cloudinary.uploader.upload_stream(
    {
      folder: "problems",
      width: 800,
      height: 800,
      crop: "fill",
    },
    (error, result) => {
      if (error) return next(error);

      req.body.problemPhoto = result.secure_url;
      next();
    },
  );

  streamifier.createReadStream(req.file.buffer).pipe(stream);
};
