export const generateGameCode = () => {
  const code = Math.random().toString(36).substring(2, 7).toUpperCase();
  console.log(`[utils.js/generateGameCode] Generated game code: ${code}`);
  return code;
};
