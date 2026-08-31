/** @format */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { RosterProvider } from "../src/context/RosterProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <RosterProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name='index' />
          <Stack.Screen name='roster' />
          <Stack.Screen name='lineup' />
          <Stack.Screen name='advisor' />
          <Stack.Screen name='espn-setup' />
        </Stack>
      </RosterProvider>
    </QueryClientProvider>
  );
}
