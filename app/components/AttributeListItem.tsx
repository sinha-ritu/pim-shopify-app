import { ResourceList, TextStyle } from "@shopify/polaris";
import { Attribute } from "../models/attribute.server";

export const AttributeListItem = ({ attribute }: { attribute: Attribute }) => {
  return (
    <ResourceList.Item
      id={attribute.code}
      accessibilityLabel={`View details for ${attribute.labels?.en_US || attribute.code}`}
    >
      <h3>
        <TextStyle variation="strong">
          {attribute.labels?.en_US || attribute.code}
        </TextStyle>
      </h3>
      <p>{attribute.type}</p>
    </ResourceList.Item>
  );
};
