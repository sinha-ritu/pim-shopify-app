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
  const productIdentifier = formData.get("productIdentifier") as string;
  const productName = formData.get("productName") as string;

  if (!productIdentifier || !productName) {
    return json({ error: "Missing mandatory information" }, { status: 400 });
  }

  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(
    `#graphql
      mutation populateProduct($input: ProductInput!) {
        productCreate(input: $input) {
          product {
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
          title: productName,
          handle: productIdentifier,
        },
      },
    }
  );

  const responseJson = await response.json();
  const errors = responseJson.data?.productCreate?.userErrors;

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
    const products = await akeneoClient.product.get({
      query: { page: page, limit: limit, locales: "nl_NL" },
    });
    return json({ products, page });
  } catch (error) {
    console.error('Failed to connect to Akeneo:', error);
    throw new Response("Failed to connect to Akeneo", { status: 500 });
  }
};

export default function AkeneoProducts() {
  const { products, page } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  useEffect(() => {
    if (fetcher.data) {
      if (fetcher.data.success) {
        shopify.toast.show("Product created successfully in Shopify");
      } else if (fetcher.data.error) {
        shopify.toast.show(fetcher.data.error, { isError: true });
      }
    }
  }, [fetcher.data, shopify]);

  // @ts-ignore
  const hasNextPage = products._links?.next?.href ? true : false;
  // @ts-ignore
  const hasPreviousPage = products._links?.previous?.href ? true : false;

  return (
    <Page
      title="Akeneo Products"
      backAction={{ content: "Home", url: "/app" }}
    >
      <BlockStack gap="500">
        <Card>
          <List>
            {products.items.map((product: any) => (
              <List.Item key={product.identifier}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <Text as="p">{product.values?.name?.[0]?.data || product.identifier}</Text>
                  <fetcher.Form method="post">
                    <input type="hidden" name="productIdentifier" value={product.identifier} />
                    <input type="hidden" name="productName" value={product.values?.name?.[0]?.data || product.identifier} />
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
