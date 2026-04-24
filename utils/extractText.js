import mammoth from "mammoth";

export const extractTextFromFile = async (file) => {
  if (!file) return null;

  console.log("Processing:", file.originalname);
  console.log("Type:", file.mimetype);

  // Only support DOCX and TXT
  if (
    file.mimetype ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer: file.buffer });

    if (!result.value || result.value.trim().length < 100) {
      throw new Error("DOCX has no readable text");
    }

    return result.value;
  }

  if (file.mimetype === "text/plain") {
    const text = file.buffer.toString("utf-8");

    if (!text || text.trim().length < 100) {
      throw new Error("Text file has insufficient content");
    }

    return text;
  }

  throw new Error(
    "Please upload a DOCX or TXT file. PDFs are currently not supported.",
  );
};
