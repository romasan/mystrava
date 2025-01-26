const HSLToRGB = ([hue, saturation, lightness]) => {
	if (hue < 0 || hue > 360 || saturation < 0 || saturation > 100 || lightness < 0 || lightness > 100) return [0, 0, 0];
	saturation /= 100; lightness /= 100;
	const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
	const secondComponent = chroma * (1 - Math.abs((hue / 60) % 2 - 1));
	const matchLightness = lightness - chroma / 2;
	return [[chroma, secondComponent, 0], [secondComponent, chroma, 0], [0, chroma, secondComponent], [0, secondComponent, chroma], [secondComponent, 0, chroma], [chroma, 0, secondComponent]][Math.floor(hue / 60)]
		.map(value => Math.round((value + matchLightness) * 255));
};

const RGBToHEX = ([r, g, b]) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');

export const getColorHeat = (v, angle = 359) => {
	const h = v * angle;
	const hsl = [h, 100, 50];
	const rgb = HSLToRGB(hsl);

	return RGBToHEX(rgb);
};

export const getGradient = (length) => Array(length)
	.fill(null)
	.map((_,i,a) => getColorHeat((1 / a.length) * i));
