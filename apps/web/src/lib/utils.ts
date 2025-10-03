import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function getFavicon(url: string) {
	try {
		const u = new URL(url)
		if (!/^https?:$/.test(u.protocol)) return ""
		let hostname: string = u.hostname
		if (!hostname) return ""
		const faviconUrl = new URL("https://www.google.com/s2/favicons")
		faviconUrl.searchParams.set("sz", "64")
		// Get only the primary domain NOT subdomain
		const parts = hostname.split('.')
		if (parts.length > 2) {
			hostname = parts.slice(-2).join('.')
		}
		// Use full hostname; avoid naive TLD slicing  
		faviconUrl.searchParams.set("domain", hostname)
		return faviconUrl.toString()
	} catch {
		return ""
	}
}  
