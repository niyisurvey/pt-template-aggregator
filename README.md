# 🚀 Portainer Template Aggregator Cloudflare Worker

A Cloudflare Worker that aggregates multiple Portainer V2 application template files into a single, de-duplicated, and sorted JSON feed for your Portainer instance.

## ✨ Features

* **Aggregates Multiple Sources**: Combines templates from various JSON feeds.
* **De-duplicates**: Removes duplicate templates based on title (case-insensitive).
* **Sorts**: Sorts the final list of templates alphabetically by title.
* **Dynamic User Sources**: Allows adding custom template sources via a URL query parameter.
* **Self-Hosted & Free**: Runs on a free Cloudflare Workers plan.

## 🤔 Why This Project?

This project was created because the original GitLab snippet by Ibaraki (and similar solutions) faced some issues with newer Portainer versions and some template sources became outdated or returned errors. This worker aims to:

1.  Provide a more robust solution for aggregating Portainer templates.
2.  Use an updated list of default template sources.
3.  Implement more resilient fetching and parsing logic.
4.  Offer clearer logging and diagnostics via Cloudflare Worker logs and response headers.

I needed a reliable way to manage a large and diverse set of Portainer templates for my self-hosting setup.

## 🛠️ How It Works

The Cloudflare Worker fetches template definitions from a list of predefined URLs and any URLs provided in a `?templates=` query parameter. It then:
1.  Parses each source.
2.  Extracts individual template objects.
3.  Filters out malformed templates.
4.  Merges all valid templates into a single list.
5.  Removes duplicates by title.
6.  Sorts the list.
7.  Returns a Portainer V2 compatible JSON response.

## 🚀 Deployment & Usage

### Prerequisites
* A Cloudflare account.
* `wrangler` CLI installed (`npm install -g wrangler`).

### Deployment
1.  Clone this repository:
    ```bash
    git clone [https://github.com/niyisurvey/pt-template-aggregator.git](https://github.com/niyisurvey/pt-template-aggregator.git)
    cd pt-template-aggregator
    ```
2.  Log in to Cloudflare (if needed):
    ```bash
    wrangler login
    ```
3.  Deploy the worker:
    ```bash
    wrangler deploy
    ```
    This will output your worker URL (e.g., `https://fresh-portainer-worker-cf.your-account.workers.dev`).

### Portainer Configuration
1.  In Portainer, navigate to **Settings** > **App Templates**.
2.  Paste your deployed worker URL into the "URL" field.
3.  Click **Save application settings**.

### Adding Custom Template Sources (via URL)
1.  Create a JSON array of your custom template URLs:
    `["https://url.to/your/templates1.json", "https://url.to/your/templates2.json"]`
2.  Base64 encode this JSON array string.
3.  Append it to your worker URL:
    `YOUR_WORKER_URL?templates=YOUR_BASE64_STRING`
4.  Use this full URL in Portainer.

## 📜 Default Template Sources

This worker uses the following default sources (you can modify these in `src/index.js`):
* `https://raw.githubusercontent.com/portainer/templates/master/templates.json` (Official Portainer)
* `https://raw.githubusercontent.com/Lissy93/portainer-templates/main/templates.json`
* `https://raw.githubusercontent.com/Qballjos/portainer_templates/master/Template/template.json`
* `https://raw.githubusercontent.com/SelfhostedPro/selfhosted_templates/portainer-2.0/Template/template.json`
    *(Please verify these URLs are still active and suitable for your needs.)*

## 🙏 Credits & Acknowledgements

* This project is an evolution of the concept originally shared by **Ibaraki** on GitLab: `https://git.ibaraki.app/-/snippets/3` (Original CF Worker for dynamic portainer templates). Thank you for the initial idea!
* Inspired by discussions and issues reported by the community on various forums regarding Portainer custom templates.
* Uses template sources provided by the Portainer team and various community members like Lissy93, Qballjos, SelfhostedPro.

## 📝 My Changes & Motivations

Compared to the original snippet or other available solutions, I've aimed to:
* **Update Source URLs**: The official Portainer template URL was updated, and other sources verified.
* **Improve Error Handling**: More resilient fetching, better handling of non-JSON responses (like `text/plain` from GitHub raw links), and timeout management.
* **Enhance Logging**: Added more detailed `console.log` statements for easier debugging via Cloudflare Worker logs.
* **Diagnostic Headers**: Implemented `X-Worker-*` response headers to provide a summary of fetched sources and processed templates.
* **Code Structure**: Refactored the worker script for better readability and maintenance.
* **Favicon Handling**: Added specific ignoring of `/favicon.ico` requests to keep logs cleaner.

The primary motivation was that the original snippet wasn't working reliably for me due to changes in Portainer, template source availability, and error handling limitations. This version attempts to address those issues.

## 📄 License

This project is provided as is. You are free to use, modify, and distribute it. If you wish to specify a formal open-source license, please add a `LICENSE` file (e.g., MIT License).

---
Created by Niyi Survey.
