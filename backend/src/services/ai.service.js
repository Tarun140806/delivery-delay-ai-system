import axios from "axios";

export const callAIService = async (data) => {
  const response = await axios.post(`${process.env.AI_BASE_URL}/predict`, data);
  return response.data;
};
