import { ResourceList, TextStyle, Thumbnail } from "@shopify/polaris";
import { Product } from "../models/product.server";

export const ProductListItem = ({ product }: { product: Product }) => {
  const media = (
    <Thumbnail
      source={product.values?.image?.[0]?.data || "https://cdn.shopify.com/s/files/1/0757/9955/files/empty-state.svg"}
      alt={product.values?.name?.[0]?.data || product.identifier}
    />
  );

  return (
    <ResourceList.Item
      id={product.identifier}
      media={media}
      accessibilityLabel={`View details for ${product.values?.name?.[0]?.data || product.identifier}`}
    >
      <h3>
        <TextStyle variation="strong">
          {product.values?.name?.[0]?.data || product.identifier}
        </TextStyle>
      </h3>
    </ResourceList.Item>
  );
};
