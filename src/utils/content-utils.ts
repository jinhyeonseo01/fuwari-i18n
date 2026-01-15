import { type CollectionEntry, getCollection } from "astro:content";
import I18nKey from "@i18n/i18nKey";
import { DEFAULT_LOCALE, i18n, SUPPORTED_LOCALES } from "@i18n/translation";
import { getCategoryUrl, getPostUrlBySlug } from "@utils/url-utils.ts";

export function getPostLang(post: CollectionEntry<"posts">): string {
	// 1. Frontmatter priority
	if (post.data.lang) {
		return post.data.lang;
	}
	// 2. Folder priority (only if matches supported locales)
	const parts = post.slug.split("/");
	if (parts.length > 1 && (SUPPORTED_LOCALES as any).includes(parts[0])) {
		return parts[0];
	}
	// 3. Default
	return DEFAULT_LOCALE;
}

export function getPostLogicalSlug(post: CollectionEntry<"posts">): string {
	const parts = post.slug.split("/");
	// If it's in a language folder (that is not frontmatter-overridden or is the folder lang)
	// Actually, logical slug is "what's left if we strip the language part".
	// If the folder is a supported locale, we strip it.
	if (parts.length > 1 && (SUPPORTED_LOCALES as any).includes(parts[0])) {
		return parts.slice(1).join("/");
	}
	return post.slug;
}

export async function getPostForLang(
	logicalSlug: string,
	lang: string,
): Promise<CollectionEntry<"posts"> | undefined> {
	const allPosts = await getRawSortedPosts();

	// 1. Try to find the post in the requested language
	const exactMatch = allPosts.find((post) => {
		const postLang = getPostLang(post);
		const postLogicalSlug = getPostLogicalSlug(post);
		return postLang === lang && postLogicalSlug === logicalSlug;
	});
	if (exactMatch) return exactMatch;

	// 2. Fallback to default language
	const defaultMatch = allPosts.find((post) => {
		const postLang = getPostLang(post);
		const postLogicalSlug = getPostLogicalSlug(post);
		return postLang === DEFAULT_LOCALE && postLogicalSlug === logicalSlug;
	});
	if (defaultMatch) return defaultMatch;

	// 3. Fallback to any language
	const anyMatch = allPosts.find((post) => {
		const postLogicalSlug = getPostLogicalSlug(post);
		return postLogicalSlug === logicalSlug;
	});
	return anyMatch;
}

export async function getSortedPostsForLang(lang: string) {
	const allPosts = await getRawSortedPosts();
	const logicalSlugs = new Set<string>();

	for (const post of allPosts) {
		logicalSlugs.add(getPostLogicalSlug(post));
	}

	const resolvedPosts: CollectionEntry<"posts">[] = [];
	for (const slug of logicalSlugs) {
		const post = await getPostForLang(slug, lang);
		if (post) resolvedPosts.push(post);
	}

	// Sort again to be sure
	return resolvedPosts.sort((a, b) => {
		const dateA = new Date(a.data.published);
		const dateB = new Date(b.data.published);
		return dateA > dateB ? -1 : 1;
	});
}

export async function getSortedPostsListForLang(
	lang: string,
): Promise<PostForList[]> {
	const sortedFullPosts = await getSortedPostsForLang(lang);

	return sortedFullPosts.map((post) => ({
		slug: getPostLogicalSlug(post),
		data: post.data,
	}));
}

export async function getRawSortedPosts() {
	const allBlogPosts = await getCollection("posts", ({ data }) => {
		if (import.meta.env.PROD && data.draft === true) return false;
		return true;
	});

	const sorted = allBlogPosts.sort((a, b) => {
		const dateA = new Date(a.data.published);
		const dateB = new Date(b.data.published);
		return dateA > dateB ? -1 : 1;
	});
	return sorted;
}

export async function getSortedPosts() {
	const sorted = await getRawSortedPosts();

	for (let i = 1; i < sorted.length; i++) {
		sorted[i].data.nextSlug = sorted[i - 1].slug;
		sorted[i].data.nextTitle = sorted[i - 1].data.title;
	}
	for (let i = 0; i < sorted.length - 1; i++) {
		sorted[i].data.prevSlug = sorted[i + 1].slug;
		sorted[i].data.prevTitle = sorted[i + 1].data.title;
	}

	return sorted;
}
export type PostForList = {
	slug: string;
	data: CollectionEntry<"posts">["data"];
};
export async function getSortedPostsList(): Promise<PostForList[]> {
	const sortedFullPosts = await getRawSortedPosts();

	const sortedPostsList = sortedFullPosts.map((post) => ({
		slug: getPostLogicalSlug(post),
		data: post.data,
	}));

	return sortedPostsList;
}
export type Tag = {
	name: string;
	count: number;
};

export async function getTagList(lang?: string): Promise<Tag[]> {
	const posts = await getSortedPostsForLang(lang || DEFAULT_LOCALE);

	const countMap: { [key: string]: number } = {};
	posts.forEach((post: { data: { tags: string[] } }) => {
		post.data.tags.forEach((tag: string) => {
			if (!countMap[tag]) countMap[tag] = 0;
			countMap[tag]++;
		});
	});

	const keys: string[] = Object.keys(countMap).sort((a, b) => {
		return a.toLowerCase().localeCompare(b.toLowerCase());
	});

	return keys.map((key) => ({ name: key, count: countMap[key] }));
}

export type Category = {
	name: string;
	count: number;
	url: string;
};

export async function getCategoryList(lang?: string): Promise<Category[]> {
	const posts = await getSortedPostsForLang(lang || DEFAULT_LOCALE);

	const count: { [key: string]: number } = {};
	posts.forEach((post: { data: { category: string | null } }) => {
		if (!post.data.category) {
			const ucKey = i18n(I18nKey.uncategorized);
			count[ucKey] = count[ucKey] ? count[ucKey] + 1 : 1;
			return;
		}

		const categoryName =
			typeof post.data.category === "string"
				? post.data.category.trim()
				: String(post.data.category).trim();

		count[categoryName] = count[categoryName] ? count[categoryName] + 1 : 1;
	});

	const lst = Object.keys(count).sort((a, b) => {
		return a.toLowerCase().localeCompare(b.toLowerCase());
	});

	const ret: Category[] = [];
	for (const c of lst) {
		ret.push({
			name: c,
			count: count[c],
			url: getCategoryUrl(c, lang),
		});
	}
	return ret;
}

export async function getPostAlternates(
	logicalSlug: string,
): Promise<{ lang: string; href: string }[]> {
	const allPosts = await getRawSortedPosts();
	const aliases = allPosts.filter(
		(post) => getPostLogicalSlug(post) === logicalSlug,
	);

	const joinAbsoluteUrl = (p: string) => {
		const site = import.meta.env.SITE.replace(/\/$/, "");
		const relative = p.replace(/^\//, "");
		return `${site}/${relative}`;
	};

	const alternates = aliases.map((post) => {
		const lang = getPostLang(post);
		return {
			lang: lang,
			href: joinAbsoluteUrl(getPostUrlBySlug(logicalSlug, lang)),
		};
	});

	// Add x-default (pointing to the version that acts as default, usually the one without prefix or the default lang)
	// In this blog stucture, root URL (default lang) is canonical default.
	const defaultLangPost = aliases.find(
		(p) => getPostLang(p) === DEFAULT_LOCALE,
	);
	if (defaultLangPost) {
		alternates.push({
			lang: "x-default",
			href: joinAbsoluteUrl(getPostUrlBySlug(logicalSlug, DEFAULT_LOCALE)),
		});
	}

	return alternates;
}
