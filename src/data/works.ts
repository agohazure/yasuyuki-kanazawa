export type WorkItem = {
	title: string;
	alt: string;
	image?: string;
	aspect: 'portrait' | 'landscape' | 'square';
};

export type WorkCategory = {
	slug: 'portrait' | 'commercial' | 'landscape' | 'documentary';
	title: string;
	description: string;
	works: WorkItem[];
};

export const categories: WorkCategory[] = [
	{
		slug: 'portrait',
		title: 'Portrait',
		description: 'Portraits shaped by presence, gesture, and quiet observation.',
		works: [
			{ title: 'Portrait 01', alt: 'Portrait photograph by Yasuyuki Kanazawa', aspect: 'portrait' },
			{ title: 'Portrait 02', alt: 'Portrait photograph by Yasuyuki Kanazawa', aspect: 'landscape' },
			{ title: 'Portrait 03', alt: 'Portrait photograph by Yasuyuki Kanazawa', aspect: 'portrait' },
		],
	},
	{
		slug: 'commercial',
		title: 'Commercial',
		description: 'Commissioned work for people, products, places, and ideas.',
		works: [
			{ title: 'Commercial 01', alt: 'Commercial photograph by Yasuyuki Kanazawa', aspect: 'landscape' },
			{ title: 'Commercial 02', alt: 'Commercial photograph by Yasuyuki Kanazawa', aspect: 'square' },
			{ title: 'Commercial 03', alt: 'Commercial photograph by Yasuyuki Kanazawa', aspect: 'landscape' },
		],
	},
	{
		slug: 'landscape',
		title: 'Landscape',
		description: 'Land, city, weather, and the space between them.',
		works: [
			{ title: 'Landscape 01', alt: 'Landscape photograph by Yasuyuki Kanazawa', aspect: 'landscape' },
			{ title: 'Landscape 02', alt: 'Landscape photograph by Yasuyuki Kanazawa', aspect: 'landscape' },
			{ title: 'Landscape 03', alt: 'Landscape photograph by Yasuyuki Kanazawa', aspect: 'portrait' },
		],
	},
	{
		slug: 'documentary',
		title: 'Documentary',
		description: 'Photographs of people, time, and lived experience.',
		works: [
			{ title: 'Documentary 01', alt: 'Documentary photograph by Yasuyuki Kanazawa', aspect: 'landscape' },
			{ title: 'Documentary 02', alt: 'Documentary photograph by Yasuyuki Kanazawa', aspect: 'portrait' },
			{ title: 'Documentary 03', alt: 'Documentary photograph by Yasuyuki Kanazawa', aspect: 'landscape' },
		],
	},
];
