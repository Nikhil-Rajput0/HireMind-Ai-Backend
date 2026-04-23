export const calculateATSScore = (resume) => {
  let score = 0;

  if (resume.skills?.length > 3) score += 20;
  if (resume.experience?.length > 0) score += 25;
  if (resume.projects?.length > 0) score += 20;
  if (resume.summary?.length > 50) score += 15;
  if (resume.role) score += 10;

  return score;
};
