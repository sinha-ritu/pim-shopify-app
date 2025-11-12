import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import {
  Link,
  useFetcher,
  useLoaderData,
  useNavigate,
  useSubmit,
} from "@remix-run/react";
import {
  Page,
  Card,
  BlockStack,
  ButtonGroup,
  Button,
  ResourceList,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useEffect, useState } from "react";
import { getAkeneoClient } from "../akeneo.server";
import { authenticate } from "../shopify.server";
import { ProductListItem } from "../components/ProductListItem.tsx";
import { EmptyStateComponent } from "../components/EmptyState.tsx";
import type { Product } from "../models/product.server.ts";

const createProductInShopify = async (
  admin: any,
  product: Product
) => {
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
          title: product.values?.name?.[0]?.data || product.identifier,
          handle: product.identifier,
        },
      },
    }
  );

  const responseJson = await response.json();
  const errors = responseJson.data?.productCreate?.userErrors;

  if (errors && errors.length > 0) {
    return { error: errors[0].message };
  }

  return { success: true };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const actionType = formData.get("actionType");
  const { admin } = await authenticate.admin(request);

  if (actionType === "bulk") {
    const productsData = formData.getAll("products[]");
    if (productsData.length === 0) {
      return json({ error: "No products selected" }, { status: 400 });
    }

    const products: Product[] = productsData.map((prod) => JSON.parse(prod as string));
    for (const product of products) {
      const result = await createProductInShopify(admin, product);
      if (result.error) {
        return json({ error: result.error }, { status: 400 });
      }
    }

    return json({ success: true });
  } else {
    const productIdentifier = formData.get("productIdentifier") as string;
    const productName = formData.get("productName") as string;

    if (!productIdentifier || !productName) {
      return json({ error: "Missing mandatory information" }, { status: 400 });
    }

    const product: Product = {
      identifier: productIdentifier,
      values: { name: [{ data: productName, locale: "", scope: "" }] },
      _links: {},
    };

    return json(await createProductInShopify(admin, product));
  }
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = 10;
  const category = url.searchParams.get("category");

  const query: {
    page: number;
    limit: number;
    locales: string;
    search?: string;
  } = {
    page: page,
    limit: limit,
    locales: "nl_NL",
  };

  if (category) {
    query.search = `{"categories":[{"operator":"IN","value":["${category}"]}]}`;
  }

  try {
    const akeneoClient = await getAkeneoClient(request);
    const products = await akeneoClient.product.get({
      query: query,
    });

    const hasNextPage = products._links?.next?.href ? true : false;
    const hasPreviousPage = products._links?.previous?.href ? true : false;

    return json({ products, page, hasNextPage, hasPreviousPage, category });
  } catch (error: any) {
    console.error("Failed to connect to Akeneo:", error);
    throw new Response(error.message, { status: 500 });
  }
};

export default function AkeneoProducts() {
  const { products, page, hasNextPage, hasPreviousPage, category } =
    useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const submit = useSubmit();
  const navigate = useNavigate();
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

  const handleBulkImport = () => {
    const formData = new FormData();
    formData.append("actionType", "bulk");
    selectedProducts.forEach((productIdentifier) => {
      const product = products.items.find(
        (prod: Product) => prod.identifier === productIdentifier
      );
      if (product) {
        formData.append("products[]", JSON.stringify(product));
      }
    });
    submit(formData, { method: "post" });
    setSelectedProducts([]);
  };

  if (!products || products.items.length === 0) {
    return (
      <EmptyStateComponent
        title="No products found"
        message="No products were found in your Akeneo instance for the selected criteria."
      />
    );
  }

  const prevPageLink = `?${category ? `category=${category}&` : ""}page=${
    page - 1
  }`;
  const nextPageLink = `?${category ? `category=${category}&` : ""}page=${
    page + 1
  }`;

  return (
    <Page
      title="Akeneo Products"
      backAction={{ content: "Home", onAction: () => navigate("/app") }}
      primaryAction={{
        content: "Bulk Import",
        onAction: handleBulkImport,
        disabled: selectedProducts.length === 0,
      }}
    >
      <BlockStack gap="500">
        <Card>
          <ResourceList
            resourceName={{ singular: "product", plural: "products" }}
            items={products.items}
            renderItem={(product: Product) => (
              <ProductListItem product={product} />
            )}
            selectedItems={selectedProducts}
            onSelectionChange={setSelectedProducts}
            selectable
          />
        </Card>
        <ButtonGroup>
          {hasPreviousPage && (
            <Link to={prevPageLink}>
              <Button>Previous</Button>
            </Link>
          )}
          {hasNextPage && (
            <Link to={nextPageLink}>
              <Button>Next</Button>
            </Link>
          )}
        </ButtonGroup>
      </BlockStack>
    </Page>
  );
}
