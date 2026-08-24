import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const kitchen = defineCollection({
	loader: glob({ pattern: '**/*.json', base: './src/data/kitchen' }),
	schema: z.object({
		schema: z.literal('kitchen-recipe/1'),
		sequence: z.number().int().positive(),
		title: z.string(),
		category: z.string(),
		lede: z.string(),
		provenance: z.string(),
		meta: z.object({
			baseScale: z.string(),
			timeMinutes: z.number().int().positive(),
			equipment: z.array(z.string()),
				tags: z.array(z.string()),
		}),
		servingOptions: z.array(
			z.object({
				key: z.string(),
				label: z.string(),
				note: z.string(),
			}),
		),
		ingredientGroups: z.array(
			z.object({
				label: z.string(),
				note: z.string().optional(),
				items: z.array(
					z.object({
						name: z.string(),
						amounts: z.record(z.string(), z.string()),
						note: z.string().optional(),
					}),
				),
			}),
		),
		timeline: z.object({
			totalMinutes: z.number().int().positive(),
			baseLabel: z.string(),
			tracks: z.array(
				z.object({
					label: z.string(),
					items: z.array(
						z.object({
							start: z.number().int().nonnegative(),
							end: z.number().int().positive(),
							title: z.string(),
							detail: z.string(),
							kind: z.enum(['active', 'heat', 'passive']),
						}),
					),
				}),
			),
		}),
		story: z
			.object({
				label: z.string(),
				title: z.string(),
				body: z.array(
					z.object({
						text: z.string(),
						href: z.string().url().optional(),
					}),
				),
			})
			.optional(),
		platingTitle: z.string(),
		steps: z.array(
			z.object({
				title: z.string(),
				body: z.string(),
				tip: z.string().optional(),
			}),
		),
		platingRules: z.array(
			z.object({
				title: z.string(),
				body: z.string(),
			}),
		),
		variations: z.array(
			z.object({
				title: z.string(),
				body: z.string(),
			}),
		),
	}),
});

export const collections = { kitchen };
