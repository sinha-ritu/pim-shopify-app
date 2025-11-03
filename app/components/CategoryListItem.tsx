import { ResourceList, TextStyle } from "@shopify/polaris";
import { Category } from "../models/category.server";

export const CategoryListItem = ({ category }: { category: Category }) => {
  return (
    <ResourceList.Item
      id={category.code}
      accessibilityLabel={`View details for ${category.labels?.en_US || category.code}`}
      onClick={() => {
        // Handle click if necessary
      }}
    >
      <h3>
        <TextStyle variation="strong">
          {category.labels?.en_US || category.code}
        </TextStyle>
      </h3>
    </ResourceList.Item>
  );
};
