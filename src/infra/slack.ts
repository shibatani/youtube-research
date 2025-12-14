export const notifySlack = async (text: string): Promise<void> => {
  if (!process.env.SLACK_WEBHOOK_URL) {
    console.warn("SLACK_WEBHOOK_URL is not set. Skipping notification.");
    return;
  }

  const response = await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    console.error(`Slack notification failed: ${response.status}`);
  }
};
