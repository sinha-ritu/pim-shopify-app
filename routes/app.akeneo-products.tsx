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
import { getAkeneoClient } from "../akeneo.server";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const actionType = formData.get("actionType");

  if (actionType === "bulk") {
    const products = formData.getAll("products[]").map((prod) => JSON.parse(prod as string));
    const { admin } = await authenticate.admin(request);

    for (const product of products) {
      await admin.graphql(
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
              title: product.values?.name?.[0]?.data || product.identifier,
              handle: product.identifier,
            },
          },
        }
      );
    }

    return json({ success: true });
  } else {
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
  }
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = 10;

  try {
    const akeneoClient = await getAkeneoClient(request);
    const products = await akeneoClient.product.get({
      query: { page: page, limit: limit, locales: "nl_NL" },
    });
    return json({ products, page });
  } catch (error) {
    console.error('Failed to connect to Akeneo:', error);
    throw new Response("Failed to connect to Akeneo", { status: 500 });
  }
};

import { Checkbox } from "@shopify/polaris";
import { useState } from "react";

export default function AkeneoProducts() {
  const { products, page } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

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

  const handleBulkImport = () => {
    const formData = new FormData();
    formData.append("actionType", "bulk");
    selectedProducts.forEach((productIdentifier) => {
      const product = products.items.find((prod: any) => prod.identifier === productIdentifier);
      if (product) {
        formData.append("products[]", JSON.stringify(product));
      }
    });
    fetcher.submit(formData, { method: "post" });
  };

  return (
    <Page
      title="Akeneo Products"
      backAction={{ content: "Home", url: "/app" }}
      primaryAction={{
        content: "Bulk Import",
        onAction: handleBulkImport,
        disabled: selectedProducts.length === 0,
      }}
    >
      <BlockStack gap="500">
        <Card>
          <BlockStack>
            {products.items.map((product: any) => (
              <div key={product.identifier} style={{ paddingBlock: 'var(--p-space-200)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <Checkbox
                    label={`${product.values?.name?.[0]?.data || product.identifier}`}
                    checked={selectedProducts.includes(product.identifier)}
                    onChange={(checked) => {
                      if (checked) {
                        setSelectedProducts([...selectedProducts, product.identifier]);
                      } else {
                        setSelectedProducts(
                          selectedProducts.filter((id) => id !== product.identifier)
                        );
                      }
                    }}
                  />
                  <fetcher.Form method="post">
                    <input type="hidden" name="productIdentifier" value={product.identifier} />
                    <input type="hidden" name="productName" value={product.values?.name?.[0]?.data || product.identifier} />
                    <Button submit loading={fetcher.state === "submitting"}>
                      Create in Shopify
                    </Button>
                  </fetcher.Form>
                </div>
              </div>
            ))}
          </BlockStack>
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
