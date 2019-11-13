'use strict'
const fs          = require('fs');
const path        = require('path');
const http        = require('http');
const https       = require('http');
const _           = require('lodash');
const request     = require('request');
const cheerio     = require('cheerio');
const async       = require('async');
const slugify     = require('slugify');
const ProgressBar = require('ascii-progress');
const inquirer    = require('inquirer');
const shell       = require('shelljs');
const pkg         = require('./../package.json');

/**
 * JavaScript base class for scraping documentation pages
 */
class Scraper {

	constructor(keywords, filters, overwrite) {
		this.baseUrl = 'http://www.allitebooks.com/';
		this.keywords = keywords;
		this.filters = filters;
		this.overwrite = overwrite;
		this.logger = null;
		this.pageScraperProgress = null;
		this.bookDetailsScraperProgress = null;
		this.bookDownloadProgress = null;
		this.downloadQueneSize = 3;
		this.scraperQueneSize = 10;
		this.timeout = null;
		this.progress = true;
		this._downloadPath = '';

		// log in single line
		this.logger = new ProgressBar({ schema: 'All IT Books Download', total: 999999999999 })

		this.confirmPrompts = {
			'downloadChoice': 'Yes',
			'legalChoice': 'Yes, I understand and accept any legal consequences that may arise from obtaining books from illegal sources',
			'buyChoice': 'I PROMISE TO SUPPORT THE AUTHORS OF BOOKS I LIKE BY BUYING FROM THEIR PUBLISHERS!',
		}
	}

	set scraperTimeout(value) {
		this.timeout = value;
	}
	
	set progressIndicators(value) {
		this.progress = value;
	}
	
	set downloadPath(value) {
		this._downloadPath = value;
	}

	displayLogo() {
		const row = '|                                                                   |';
		let version = `v${pkg.version}`;
		const sideSpacesCount = Math.floor( (row.length - 2 - version.length) / 2);
		
		if((row.length - 2 - version.length) % 2) version += ' ';
		
		const genSpaces = amount => {
			let output = '';
			for (let index = 0; index < amount; index++) output += ' ';
			return output;
		}
		
		const versionRow = `|${genSpaces(sideSpacesCount)}${version}${genSpaces(sideSpacesCount)}|`
		
		console.log(`


          /-----------------------------------------------\\
         /                                                 \\
        /         __...--~~~~~-._   _.-~~~~~--...__         \\
       /        //               \`V'               \\\\        \\
      /        //                 |                 \\\\        \\
     /        //__...--~~~~~~-._  |  _.-~~~~~~--...__\\\\        \\
    /        //__.....----~~~~._\\ | /_.~~~~----.....__\\\\        \\
   /        ====================\\\\|//====================        \\
  /                             \`---\`                             \\
 /                                                                 \\
/-------------------------------------------------------------------\\
|                                                                   |
|                        IT Ebook Downloader                        |
${versionRow}
|                                                                   |
---------------------------------------------------------------------
																 
		`);
	}
	
	potato() {
		console.log(`

  Can't help you, but here's a...

  		,d                 ,d                
  		88                 88                
  8b,dPPYba,   ,adPPYba, MM88MMM ,adPPYYba, MM88MMM ,adPPYba,   
  88P'    "8a a8"     "8a  88    ""     \`Y8   88   a8"     "8a  
  88       d8 8b       d8  88    ,adPPPPP88   88   8b       d8  
  88b,   ,a8" "8a,   ,a8"  88,   88,    ,88   88,  "8a,   ,a8"  
  88\`YbbdP"\'   \`"YbbdP"\'   "Y888 \`"8bbdP"Y8   "Y888 \`"YbbdP"\'   
  88                                                            
  88                      

		`)
	}

	bye() {
		console.log(`


    BBBBBBBBBBBBBBBBB        YYYYYYY       YYYYYYY     EEEEEEEEEEEEEEEEEEEEEE
    B::::::::::::::::B       Y:::::Y       Y:::::Y     E::::::::::::::::::::E
    B::::::BBBBBB:::::B      Y:::::Y       Y:::::Y     E::::::::::::::::::::E
    BB:::::B     B:::::B     Y::::::Y     Y::::::Y     EE::::::EEEEEEEEE::::E
      B::::B     B:::::B     YYY:::::Y   Y:::::YYY       E:::::E       EEEEEE
      B::::B     B:::::B        Y:::::Y Y:::::Y          E:::::E             
      B::::BBBBBB:::::B          Y:::::Y:::::Y           E::::::EEEEEEEEEE   
      B:::::::::::::BB            Y:::::::::Y            E:::::::::::::::E   
      B::::BBBBBB:::::B            Y:::::::Y             E:::::::::::::::E   
      B::::B     B:::::B            Y:::::Y              E::::::EEEEEEEEEE   
      B::::B     B:::::B            Y:::::Y              E:::::E             
      B::::B     B:::::B            Y:::::Y              E:::::E       EEEEEE
    BB:::::BBBBBB::::::B            Y:::::Y            EE::::::EEEEEEEE:::::E
    B:::::::::::::::::B          YYYY:::::YYYY         E::::::::::::::::::::E
    B::::::::::::::::B           Y:::::::::::Y         E::::::::::::::::::::E
    BBBBBBBBBBBBBBBBB            YYYYYYYYYYYYY         EEEEEEEEEEEEEEEEEEEEEE


		`);
	}

	respectQuote() {
		console.log(`

  "Respect for ourselves guides our morals,
       respect for others guides our manners."

                                 Laurence Sterne

`);
	}

	log(message) {
		return;
		const msg = message || ' '
		this.logger.setSchema(msg);
		this.logger.tick();
	}

	/**
	 * Main scraper method
	 * @param {string} url - Web page to load
	 * @return {object}
	 */
	async scraper(url) {
		return new Promise((resolve, reject) => {
			let timeout = null;
			
			if(this.timeout && typeof this.timeout === 'number') {
				timeout = setTimeout(() => {
					console.log('Timeout...');
					reject();
				}, this.timeout)
			}
			
			request(url, (err, resp, html) => {
		    if (!err){
					const $ = cheerio.load(html)
					clearInterval(timeout);
		      resolve($)
		    } else {
					clearInterval(timeout);
		    	reject(err)
		    }
			})
		})
	}

	/**
	 * Returns search query string based on input keywords
	 */
	searchQuery() {
		if(!this.keywords) return '';

		const parsedKeywords = this.keywords
			.split(' ')
			.filter(item => item.length)
			.join('+');
		
		return `?s=${parsedKeywords}`;
	}

	/**
	 * Returns search query string based on inpit keywords
	 *
	 * @param {number} page 
	 */
	constructUrl(page) {
		return `${this.baseUrl}page/${page}/${this.searchQuery()}`;
	}

	/**
	 * Check how many pages of results exist for given search criteria
	 */
	getPagesCount() {
		return new Promise((resolve, reject) => {
			this.scraper(this.constructUrl(1))
				.then($ => {
					const count = $('.pagination > a').last().text() || 1;
					resolve(Number(count));
				}).catch(err => {
					reject(err)
				})
		})
	}

	/**
	 * Get book data from all pages 
	 * @param {number} count - array of links to scrape (in order)
	 * @return {object}
	 */
	async getAllPages(count, start, end) {
		this.log('- Scraping content...')

		const min = typeof start === 'number' ? start : 0;
		const max = end + 1 || count;
		const total = max - min

		// create pages array based on page count
		let pages = [];
		for (let index = min; index < max; index++) pages.push(index+1);
		
		return new Promise((resolve, reject) => {
			let books = [];
			let done = 0;

			// set progress bar
			if(this.progress) {
				this.pageFetchProgress = new ProgressBar({
					schema: '[ :bar ] :percent | Page fetch',
					total
				})
			}

			// limiting amount of parallel requests to 10 for optimal performance
			async.eachLimit(pages, this.scraperQueneSize, (pageNumber, callback) => {
				this.getBooks(pageNumber)
					.then(bookList => {
						// update progress bar
						if(this.progress) {
							done++;
							this.pageFetchProgress.setSchema(`[ :bar ] :percent | Fetched ${done} of ${total} pages`);
							this.pageFetchProgress.tick();
						}

						books = books.concat(bookList)
						callback()
					}).catch(err => {
						callback(err)
					})
			}, err => {
		    if(err) {
		      return reject(err)
		    }

				// return compiled array of book data
		    resolve(books)
			})
		})
	}

	/**
	 * Get books data from given page
	 * @param {string} url - Web page to load
	 * @return {string}
	 */
	async getBooks(page) {
		const url = this.constructUrl(page);
		
		this.log(`- Scraping books page: ${url}`)

		return new Promise((resolve, reject) => {
			this.scraper(url)
				.then($ => {
					const books = []

					$('article.post').each(function(i, elem) {
						books.push({
							title: $(this).find('.entry-title > a').text(),
							authors: $(this).find('.entry-author').text().replace('By: ', ''),
							url: $(this).find('.entry-title > a').attr('href'),
							page
						});
					});

					resolve(books);
				}).catch(err => {
					reject(err)
				})
			})
	}
	
	/**
	 * Get single book data from given page
	 * @param {string} url - Web page to load
	 * @return {string}
	 */
	async getBook(url) {
		this.log(`- Scraping book page: ${url}`)

		return new Promise((resolve, reject) => {
			this.scraper(url)
				.then($ => {
					const book = {
						title: $('.single-title').text(),
						cover: $('.attachment-post-thumbnail').attr('src'),
						description: $('.entry-content').html(),
						// downloadLinks: []
					};

					$('.book-detail dd').each(function(i, elem) {
						if(i == 1) book.isbn = $(this).text().trim();
						if(i == 2) book.year = Number($(this).text().trim());
						if(i == 3) book.pages = Number($(this).text().trim());
						if(i == 7) book.category = $(this).text().trim();
					})

					$('.download-links > a').each(function(i, elem) {
						// book.downloadLinks.push($(this).attr('href'));
						if($(this).attr('href').indexOf('pdf')) {
							book.downloadLink = $(this).attr('href');
						}
					})

					book.slug = slugify(book.title, { replacement: '_', lower: true });

					setTimeout(() => { resolve(book); }, 200)
				}).catch(err => {
					reject(err)
				})
			})
	}
	
	/**
	 * Get book data from given page
	 * @param {object} books
	 */
	async attachBookData(books, queneSize) {
		this.log(`- Scraping book details...`)

		const numOfParallelRequests = queneSize || this.scraperQueneSize;

		return new Promise((resolve, reject) => {
			// set progress bar
			let done = 0;
			let count = books.length;
			
			if(this.progress) {
				this.bookDetailsScraperProgress = new ProgressBar({
					schema: '[ :bar ] :percent | Book details',
					total: books.length
				})
			}
			
			// limiting amount of parallel requests to 10 for optimal performance
			async.eachLimit(books, this.scraperQueneSize, (book, callback) => {
				this.getBook(book.url)
					.then(bookDetails => {
						// update progress bar
						if(this.progress) {
							done++;
							this.bookDetailsScraperProgress.setSchema(`[ :bar ] :percent | Fetching books ${done} of ${count}`);
							this.bookDetailsScraperProgress.tick();
						}

						// extend source book data with new data
						books = books.map(b => b.title === book.title ? Object.assign(book, bookDetails) : b);

						setTimeout(callback, 200);

						// callback()
					}).catch(err => {
						// update progress bar
						if(this.progress) {
							done++;
							this.bookDetailsScraperProgress.setSchema(`[ :bar ] :percent | Fetching books ${done} of ${count}`);
							this.bookDetailsScraperProgress.tick();
						}

						callback(err)
					})
			}, err => {
		    if(err) {
		      return reject(err)
		    }

				// return compiled array of book data
		    resolve(books)
			})
		})
	}

	/**
	 * Apply age filter
	 * @param {object} input
	 * @param {string} age
	 */
	ageFilter(input, age) {
		const currYear = (new Date()).getFullYear();
		return input.filter(book => currYear - Number(age) < book.year);
	}
	
	/**
	 * Apply year filter
	 * @param {object} input
	 * @param {string} year
	 */
	yearFilter(input, year) {
		return input.filter(book => Number(year) === book.year);
	}
	
	/**
	 * Apply pages minimum filter
	 * @param {object} input
	 * @param {string} pagesMin
	 */
	pagesMinFilter(input, pagesMin) {
		return input.filter(book => Number(pagesMin) <= book.pages);
	}
	
	/**
	 * Apply pages maximum filter
	 * @param {object} input
	 * @param {string} pagesMax
	 */
	pagesMaxFilter(input, pagesMax) {
		return input.filter(book => Number(pagesMax) >= book.pages);
	}

	/**
	 * Apply pages minimum filter
	 * @param {object} input
	 * @param {string} pagesMin
	 */
	applyFilters(books) {
		let source = _.cloneDeep(books);
		
		Object.keys(this.filters).forEach(filterKey => {
			if(this.filters[filterKey] !== null) {
				// mutate source object
				source = this[`${filterKey}Filter`](source, this.filters[filterKey]);
			}
		})

		return source;
	}

	/**
	 * Display list of books
	 * @param {object} books
	 */
	displayList(books) {

		console.log('\n');

		if(!books.length) return console.log('No books found...\n')

		// sort by newest to oldest, alphabetically, by page etc.
		const sorted = _(_.cloneDeep(books)).sortBy(book => {
			return `${99999999 - book.year}_${book.slug}`
		}).value()

		const s = sorted.length > 1 ? 's' : ''
		console.log(`Found ${sorted.length} book${s}:\n`);
		
		sorted.forEach(book => {
			console.log(`[ ${book.year} ] ${book.title} - ${book.authors}`);
		})
		
		console.log(`\n`);
	}

	static displayHints() {
		console.log(`Usage  [options]
		
Options:

 --keywords    Search criteria
 --age         Filter by max book age
 --year        Filter by book publication year
 --pagesMin    Filter by a minimum number of pages for book
 --pagesMax    Filter by a maximum number of pages for book
 --overwrite   Should existing files be overwritten (default: true)
 		`)
	}

	async keywordsPrompt() {
		return inquirer.prompt({
			type: 'input',
			name: 'keywords',
			message: 'Enter search keyword(s):'
		})
	}
	
	async folderPrompt() {
		const defaultFolder = this.keywords.split(' ').filter(item => item.length).join(' ');
		
		return inquirer.prompt({
			type: 'input',
			name: 'folder',
			message: 'Name of folder to download books to (optional):',
			default: defaultFolder
		})
	}
	
	async downloadPrompt() {
		return inquirer.prompt({
			type: 'list',
			name: 'download',
			message: 'Would you like to download these books?',
			choices: [this.confirmPrompts.downloadChoice, 'No']
		})
	}
	
	async downloadLegalPrompt() {
		return inquirer.prompt({
			type: 'list',
			name: 'legal',
			message: 'You do know this is kind of illegal, right?',
			choices: [
				this.confirmPrompts.legalChoice,,
				'I didn\'t know that, get me out of here!'
			]
		})
	}
	
	async downloadConfirmPrompt() {
		return inquirer.prompt({
			type: 'list',
			name: 'buy',
			message: 'You should ALWAYS support the authors of books that you like, even if you downloaded their book(s) online for free! Do you promise to support the authors of your favorite books by buying from the publisher?',
			choices: [
				this.confirmPrompts.buyChoice,
				'Just give me the books already!'
			]
		})
	}

	async downloadPromptInit() {
		return new Promise((resolve, reject) => {
			this.downloadPrompt().then(downloadChoice => {
				if(downloadChoice.download === this.confirmPrompts.downloadChoice) {
					this.downloadLegalPrompt().then(legalChoice => {
						if(legalChoice.legal === this.confirmPrompts.legalChoice) {
							this.downloadConfirmPrompt().then(buyChoice => {
								if(buyChoice.buy === this.confirmPrompts.buyChoice) {
									// procedd with download
									resolve(true);
								}	else {
									this.potato();
									resolve(false)
								}
							})
						} else {
							this.respectQuote();
							resolve(false);
						}
					})
				}
			});
		});
	}

	get currPath() {
		const isWin = process.platform.toLowerCase().indexOf('win') > -1 && process.platform.toLowerCase().indexOf('darwin') === -1;
		const currDirCommand = isWin ? 'cd' : 'pwd';
		return shell.exec(currDirCommand, {silent: true }).stdout.trim();
	}

	constructDownloadPath(folder) {
		const currPath = this.currPath;
		return folder ? path.join(currPath, folder) : currPath;
	}

	makeDir(name) {
		if(!fs.existsSync(name)) fs.mkdirSync(name);
	}

	async downloadFile(url, destination) {
		return new Promise((resolve, reject) => {
			try {
				// check if file exists already
				if(!this.overwrite && fs.existsSync(destination)) {
					resolve(true);
					return;
				}

				// create download stream
				let file = fs.createWriteStream(destination);
				
				file.on('finish', () => { 
					file.close();
					resolve(true);
				});
				
				file.on('error', (err) => {
					console.log('Error saving file: ${destination}`');
					file.close();
					
					// try { fs.unlink(destination) } catch (error) {}
					
					resolve(false);
				});
				
				const handler = response => { response.pipe(file) }
			
				if(url.substring(0, 5) === 'https') {
					https.get(url, handler);
				} else {
					http.get(url, handler);
				}
			} catch(e) {
				console.log(e);
				resolve(false);
			}
		})
	}

	constructBookFilename(book) {
		return `(${book.year}) ${book.title}.${book.downloadLink.split('.').pop()}`;
	}

	async batchDownload(books, downloadPath) {
		return new Promise((resolve, reject) => {
			// set progress bar
			let done = 0;
			let count = books.length;
			
			this.bookDownloadProgress = new ProgressBar({
				schema: `[ :bar ] :percent | Downloading 0 of ${count}`,
				total: books.length
			})
			this.bookDownloadProgress.tick();

			const that = this;
			
			// limiting amount of parallel requests for optimal performance
			async.eachLimit(books, this.downloadQueneSize, function(book, callback) {
				
				const absFilePath = path.join(downloadPath, that.constructBookFilename(book));
				
				that.downloadFile(book.downloadLink, absFilePath)
					.then(result => {
						// update progress bar
						done++;
						that.bookDownloadProgress.setSchema(`[ :bar ] :percent | Downloading ${done} of ${count}`);
						that.bookDownloadProgress.tick();
						
						callback()
					}).catch(err => {
						// update progress bar
						done++;
						that.bookDownloadProgress.setSchema(`[ :bar ] :percent | Downloading ${done} of ${count}`);
						that.bookDownloadProgress.tick();

						// callback(err);
					})
			}, err => {
		    if(err) {
					resolve(false);
				}
				
				that.bookDownloadProgress.clear();

				// return compiled array of book data
		    resolve(true)
			})
		})
	}

}

module.exports = Scraper;