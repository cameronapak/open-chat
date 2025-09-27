import Loader from "@/components/loader";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import {
	HeadContent,
	Outlet,
	createRootRouteWithContext,
	useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import "../index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const queryClient = new QueryClient();

export interface RouterAppContext {}

export const Route = createRootRouteWithContext<RouterAppContext>()({
	component: RootComponent,
	head: () => ({
		meta: [
			{
				title: "open-chat",
			},
			{
				name: "description",
				content: "open-chat is a web application",
			},
		],
		links: [
			{
				rel: "icon",
				href: "/favicon.ico",
			},
		],
	}),
});

function RootComponent() {
	const isFetching = useRouterState({
		select: (s) => s.isLoading,
	});

	return (
		<QueryClientProvider client={queryClient}>
			<>
				<HeadContent />
				<ThemeProvider
					attribute="class"
					defaultTheme="light"
					disableTransitionOnChange
					storageKey="vite-ui-theme"
				>
					<div className="grid grid-rows-[auto_1fr] h-svh grid-cols-1">
						{isFetching ? <Loader /> : <Outlet />}
					</div>
					<Toaster richColors />
				</ThemeProvider>
				<TanStackRouterDevtools position="bottom-left" />
				<ReactQueryDevtools initialIsOpen={false} />
			</>
		</QueryClientProvider>
	);
}
