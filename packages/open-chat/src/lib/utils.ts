import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { parseDomain, fromUrl, ParseResultType } from "parse-domain";


export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function getFavicon(url: string) {
	try {
		const parseResult = parseDomain(
			fromUrl(url),
		);

		if (parseResult.type === ParseResultType.Invalid) {
			return ""
		}

		if (parseResult.type === ParseResultType.Listed) {
			const faviconUrl = new URL("https://www.google.com/s2/favicons")
			faviconUrl.searchParams.set("sz", "64")
			faviconUrl.searchParams.set("domain", parseResult.domain + "." + parseResult.topLevelDomains.join("."))
			return faviconUrl.toString()
		}

		return ""
	} catch {
		return ""
	}
}  
