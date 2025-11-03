import { EmptyState, Page } from "@shopify/polaris";
type EmptyStateProps = {
  title: string;
  message: string;
};

export const EmptyStateComponent = ({ title, message }: EmptyStateProps) => {
  return (
    <Page>
      <EmptyState heading={title} image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png">
        <p>{message}</p>
      </EmptyState>
    </Page>
  );
};
