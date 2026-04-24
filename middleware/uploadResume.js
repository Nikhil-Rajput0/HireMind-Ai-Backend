import multer from "multer";

const storage = multer.memoryStorage();
export const uploadResume = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single("resume");
