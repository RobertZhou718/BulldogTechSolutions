const fetch = require("node-fetch");

const FUNCTION_BASE_URL = process.env.FUNCTION_BASE_URL;
const INTERNAL_SECRET = process.env.INTERNAL_SECRET;

async function executeTool(toolName, userId) {
  if (toolName === "get_investment_overview") {
    const response = await fetch(
      `${FUNCTION_BASE_URL}/api/investments/overview`,
      {
        method: "GET",
        headers: {
          "X-Debug-UserId": userId,
          "X-Internal-Secret": INTERNAL_SECRET
        }
      }
    );

    if (!response.ok) {
      throw new Error("Tool call failed");
    }

    return await response.json();
  }

  throw new Error("Unknown tool");
}

module.exports = { executeTool };