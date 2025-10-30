import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import {
  Page,
  Card,
  BlockStack,
  List,
  ButtonGroup,
  Button,
  Text,
} from "@shopify/polaris";
import { akeneoClient } from "../akeneo.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = 10;

  try {
    const productFamilies = await akeneoClient.family.get({
      query: {page: page, limit: limit}
    });
    return json({ productFamilies, page });
  } catch (error) {
    console.error('Failed to connect to Akeneo:', error);
    throw new Response("Failed to connect to Akeneo", { status: 500 });
  }
};

export default function AkeneoProductFamilies() {
  const { productFamilies, page } = useLoaderData<typeof loader>();

  // @ts-ignore
  const hasNextPage = productFamilies._links?.next?.href ? true : false;
  // @ts-ignore
  const hasPreviousPage = productFamilies._links?.previous?.href ? true : false;

  return (
    <Page
      title="Akeneo Product Families"
      backAction={{ content: "Home", url: "/app" }}
    >
      <BlockStack gap="500">
        <Card>
          <List>
            {productFamilies.items.map((family: any) => (
              <List.Item key={family.code}>
                <Text as="p">{family.code} - {family._links.self.href}</Text>
              </List.Item>
            ))}
          </List>
        </Card>
        <ButtonGroup>
          {hasPreviousPage && (
            <Link to={`?page=${page - 1}`}>
              <Button>Previous</Button>
            </Link>
          )}
          {hasNextPage && (
            <Link to={`?page=${page + 1}`}>
              <Button>Next</Button>
            </Link>
          )}
        </ButtonGroup>
      </BlockStack>
    </Page>
  );
}
