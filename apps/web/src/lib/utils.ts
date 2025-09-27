import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function getFavicon(url: string) {
	const domain = new URL(url).hostname.split('.').slice(-2).join('.')
	const faviconUrl = new URL("https://www.google.com/s2/favicons")
	faviconUrl.searchParams.set('sz', '64')
	faviconUrl.searchParams.set('domain', domain)
	return faviconUrl.toString()
}
