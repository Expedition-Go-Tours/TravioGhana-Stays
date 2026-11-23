import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import PreviewBanner from "@/components/shared/PreviewBanner";
import { shouldRetryQuery } from "@/lib/queryState";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      // One retry, but never for an endpoint that is not available yet.
      retry: shouldRetryQuery,
    },
  },
});

export default function Providers() {
  return (
    <QueryClientProvider client={queryClient}>
      <PreviewBanner />
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
