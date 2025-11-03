import {
  json,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from "@remix-run/node";
import {
  Link,
  useLoaderData,
  useNavigate,
  useSubmit,
  useFetcher,
} from "@remix-run/react";
import {
  Page,
  Card,
  BlockStack,
  ButtonGroup,
  Button,
  ResourceList,
} from "@shopify/polaris";
import { getAkeneoClient } from "../akeneo.server";
import { authenticate } from "../shopify.server";
import { ProductFamilyListItem } from "../components/ProductFamilyListItem";
import { EmptyStateComponent } from "../components/EmptyState";
import type { Family } from "../models/family.server";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useEffect, useState } from "react";

const createProductTypeInShopify = async (admin: any, family: Family) => {
  const response = await admin.graphql(
    `#graphql
          mutation CreateProductType($name: String!) {
            productTypeCreate(name: $name) {
              productType {
                id
                name
              }
              userErrors {
                field
                message
              }
            }
          }`,
    {
      variables: {
        name: family.code,
      },
    }
  );

  const responseJson = await response.json();
  const errors = responseJson.data?.productTypeCreate?.userErrors;

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
    const familiesData = formData.getAll("families[]");
    if (familiesData.length === 0) {
      return json({ error: "No families selected" }, { status: 400 });
    }

    const families: Family[] = familiesData.map((fam) => JSON.parse(fam as string));
    for (const family of families) {
      const result = await createProductTypeInShopify(admin, family);
      if (result.error) {
        return json({ error: result.error }, { status: 400 });
      }
    }

    return json({ success: true });
  } else {
    return json(
      { error: "Single family import not implemented yet" },
      { status: 400 }
    );
  }
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = 10;

  try {
    const akeneoClient = await getAkeneoClient(request);
    const productFamilies = await akeneoClient.family.get({
      query: { page: page, limit: limit },
    });

    const hasNextPage = productFamilies._links?.next?.href ? true : false;
    const hasPreviousPage = productFamilies._links?.previous?.href ? true : false;

    return json({ productFamilies, page, hasNextPage, hasPreviousPage });
  } catch (error: any) {
    throw new Response(error.message, { status: 500 });
  }
};

export default function AkeneoProductFamilies() {
  const { productFamilies, page, hasNextPage, hasPreviousPage } =
    useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const submit = useSubmit();
  const navigate = useNavigate();
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>([]);

  useEffect(() => {
    if (fetcher.data) {
      if (fetcher.data.success) {
        shopify.toast.show("Product family created successfully in Shopify");
      } else if (fetcher.data.error) {
        shopify.toast.show(fetcher.data.error, { isError: true });
      }
    }
  }, [fetcher.data, shopify]);

  const handleBulkImport = () => {
    const formData = new FormData();
    formData.append("actionType", "bulk");
    selectedFamilies.forEach((familyCode) => {
      const family = productFamilies.items.find(
        (fam: Family) => fam.code === familyCode
      );
      if (family) {
        formData.append("families[]", JSON.stringify(family));
      }
    });
    submit(formData, { method: "post" });
    setSelectedFamilies([]);
  };

  if (!productFamilies || productFamilies.items.length === 0) {
    return (
      <EmptyStateComponent
        title="No product families found"
        message="No product families were found in your Akeneo instance."
      />
    );
  }

  return (
    <Page
      title="Akeneo Product Families"
      backAction={{ content: "Home", onAction: () => navigate("/app") }}
      primaryAction={{
        content: "Bulk Import",
        onAction: handleBulkImport,
        disabled: selectedFamilies.length === 0,
      }}
    >
      <BlockStack gap="500">
        <Card>
          <ResourceList
            resourceName={{ singular: "family", plural: "families" }}
            items={productFamilies.items}
            renderItem={(family: Family) => <ProductFamilyListItem family={family} />}
            selectedItems={selectedFamilies}
            onSelectionChange={setSelectedFamilies}
            selectable
          />
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
