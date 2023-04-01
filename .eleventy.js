module.exports = function (eleventyConfig) {
    eleventyConfig.addPassthroughCopy("bundle.css");
    eleventyConfig.addPassthroughCopy("bundle.js");
    eleventyConfig.addPassthroughCopy("images");
};
