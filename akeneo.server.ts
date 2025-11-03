
import { createClient } from "@craftzing/akeneo-api";
import { authenticate } from "./shopify.server";
import db from "./db.server";
import { redirect } from "@remix-run/node";

export const getAkeneoClient = async (request: Request) => {
  const { session } = await authenticate.admin(request);
  const shopSession = await db.session.findUnique({
    where: {
      id: session.id,
    },
  });

  if (
    !shopSession ||
    !shopSession.akeneoUrl ||
    !shopSession.akeneoClientId ||
    !shopSession.akeneoClientSecret ||
    !shopSession.akeneoUsername ||
    !shopSession.akeneoPassword
  ) {
    throw redirect("/app/settings");
  }

  try {
    return createClient({
      url: shopSession.akeneoUrl,
      clientId: shopSession.akeneoClientId,
      secret: shopSession.akeneoClientSecret,
      username: shopSession.akeneoUsername,
      password: shopSession.akeneoPassword,
    });
  } catch (error) {
    throw redirect("/app/akeneo-auth-error");
  }
};
