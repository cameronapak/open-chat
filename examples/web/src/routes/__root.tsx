import Loader from "@/components/loader";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import {
	HeadContent,
	Outlet,
	createRootRouteWithContext,
	useRouterState,
} from "@tanstack/react-router";
import "../index.css";

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
		<>
			<HeadContent />
			<ThemeProvider
				attribute="class"
				defaultTheme="light"
				disableTransitionOnChange
				storageKey="vite-ui-theme"
			>
				<div className="grid grid-rows-[auto_1fr] h-dvh grid-cols-1">
					{isFetching ? <Loader /> : <Outlet />}
				</div>
				<Toaster richColors />
			</ThemeProvider>
			{/* <TanStackRouterDevtools position="top-right" /> */}
			{/* <ReactQueryDevtools buttonPosition="top-right" initialIsOpen={false} /> */}
		</>
	);
}
