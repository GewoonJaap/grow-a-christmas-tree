import axios from "axios";
import pino from "pino";

const logger = pino({
  level: "info"
});

export async function postFeedback(feedback: FeedbackPost) {
  try {
    const content: string[] = splitContentInMax2000Chars(
      `**User**: ${feedback.sendingUser} (${feedback.sendingUserId})\n**Server**: ${feedback.sendingServer}\n**Content**: ${feedback.content}`
    );
    content.forEach(async (contentPart, index) => {
      setTimeout(async () => {
        axios
          .post(process.env.FEEDBACK_WEBHOOK ?? "", {
            content: contentPart,
            username: "Christmas Tree Feedback"
          })
          .catch((e) => logger.error(e));
      }, index * 500);
    });
  } catch (e: unknown) {
    logger.error(e);
  }
}

export interface FeedbackPost {
  content: string;
  sendingServer: string;
  sendingUser: string;
  sendingUserId: string;
}

function splitContentInMax2000Chars(content: string): string[] {
  //split the content in parts of max 1950 chars
  const maxChars = 1950;
  const contentParts: string[] = [];
  let contentPart = "";
  let contentPartLength = 0;
  //split on char
  content.split("").forEach((char) => {
    if (contentPartLength + char.length > maxChars) {
      contentParts.push(contentPart);
      contentPart = "";
      contentPartLength = 0;
    }
    contentPart += char;
    contentPartLength += char.length;
  });
  contentParts.push(contentPart);
  return contentParts;
}
