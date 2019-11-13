'use strict'

const argv    = require('minimist')(process.argv.slice(2));
const _       = require('lodash');
const Scraper = require('./lib/scraper.class.js');

// display help only
if(_.intersection(Object.keys(argv), ['h', 'H', 'help']).length) {
	return Scraper.displayHints();
}

// display hints if no params provided
if(Object.keys(argv).length === 1) {
	Scraper.displayHints();
}

// apply filters if given
const filters = {
	age: typeof argv.age !== 'undefined' ? argv.age : null,
	year: argv.year || null,
	pagesMin: argv.pagesMin || null,
	pagesMax: argv.pagesMax || null
}
// const overwrite = argv.overwrite !== 'false' || true;
const overwrite = typeof argv.overwrite !== 'undefined' ? (argv.overwrite === 'false' ? false : true) : true;

const scraper = new Scraper(argv.keywords, filters, overwrite);


(async () => {

	scraper.displayLogo();

	try {
		if(!scraper.keywords) {
			// this.displayHints();
			const keywordsResponse = await scraper.keywordsPrompt();
			scraper.keywords = keywordsResponse.keywords.trim();
		}

		// get total pages
		const pagesCount = await scraper.getPagesCount();
		
		// fetch books from pages
		let books = await scraper.getAllPages(pagesCount);
		
		// scrape all book data from separate book pages
		await scraper.attachBookData(books);
		
		// apply filters
		books = scraper.applyFilters(books);

		// remove logger
		scraper.log();
		
		scraper.displayList(books);

		// stop execution if no books are found
		if(!books.length) return;

		// launch download confirmation prompt
		const canContinue = await scraper.downloadPromptInit();
		if(!canContinue) return;

		// choose folder name
		const folderResponse = await scraper.folderPrompt();

		const downloadPath = scraper.constructDownloadPath(folderResponse.folder);
		
		// create dir for storing
		if(folderResponse.folder) scraper.makeDir(folderResponse.folder);

		// download all
		await scraper.batchDownload(books, downloadPath);
		
		// say goodbye :)
		scraper.bye();

	} catch(e) {
		console.log('An error occured...')
		console.log(e)
	}

})()