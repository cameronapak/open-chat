import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function getFavicon(url: string) {
	try {
		const u = new URL(url)
		if (!/^https?:$/.test(u.protocol)) return ""
		const hostname = u.hostname
		if (!hostname) return ""
		const faviconUrl = new URL("https://www.google.com/s2/favicons")
		faviconUrl.searchParams.set("sz", "64")
		// Use full hostname; avoid naive TLD slicing  
		faviconUrl.searchParams.set("domain", hostname)
		return faviconUrl.toString()
	} catch {
		return ""
	}
}  
