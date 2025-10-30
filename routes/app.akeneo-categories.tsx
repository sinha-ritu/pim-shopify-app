import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, useFetcher, useLoaderData } from "@remix-run/react";
import {
  Page,
  Card,
  BlockStack,
  List,
  ButtonGroup,
  Button,
  Text,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useEffect } from "react";
import { akeneoClient } from "../akeneo.server";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const categoryCode = formData.get("categoryCode") as string;
  const categoryLabel = formData.get("categoryLabel") as string;

  if (!categoryCode || !categoryLabel) {
    return json({ error: "Missing mandatory information" }, { status: 400 });
  }

  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(
    `#graphql
      mutation collectionCreate($input: CollectionInput!) {
        collectionCreate(input: $input) {
          collection {
            id
          }
          userErrors {
            field
            message
          }
        }
      }`,
    {
      variables: {
        input: {
          title: categoryLabel,
          handle: categoryCode,
        },
      },
    }
  );

  const responseJson = await response.json();
  const errors = responseJson.data?.collectionCreate?.userErrors;

  if (errors && errors.length > 0) {
    return json({ error: errors[0].message }, { status: 400 });
  }

  return json({ success: true });
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = 10;

  try {
    const categories = await akeneoClient.category.get({
      query: { page: page, limit: limit },
    });
    return json({ categories, page });
  } catch (error) {
    console.error('Failed to connect to Akeneo:', error);
    throw new Response("Failed to connect to Akeneo", { status: 500 });
  }
};

export default function AkeneoCategories() {
  const { categories, page } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  useEffect(() => {
    if (fetcher.data) {
      if (fetcher.data.success) {
        shopify.toast.show("Category created successfully in Shopify");
      } else if (fetcher.data.error) {
        shopify.toast.show(fetcher.data.error, { isError: true });
      }
    }
  }, [fetcher.data, shopify]);
  // @ts-ignore
  const hasNextPage = categories._links?.next?.href ? true : false;
  // @ts-ignore
  const hasPreviousPage = categories._links?.previous?.href ? true : false;

  return (
    <Page
      title="Akeneo Categories"
      backAction={{ content: "Home", url: "/app" }}
    >
      <BlockStack gap="500">
        <Card>
          <List>
            {categories.items.map((category: any) => (
              <List.Item key={category.code}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <Text as="p">{category.code}</Text>
                  <fetcher.Form method="post">
                    <input type="hidden" name="categoryCode" value={category.code} />
                    <input type="hidden" name="categoryLabel" value={category.labels?.en_US || category.code} />
                    <Button submit loading={fetcher.state === "submitting"}>
                      Create in Shopify
                    </Button>
                  </fetcher.Form>
                </div>
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
