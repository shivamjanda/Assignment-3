# Assignment 2: Fitness Workout Project with Strapi CMS

## Project Overview
My project is a fitness themed web applicaiton which uses **Eleventy** as the SSG (Static Site Generator) and **Strapi** as the headless CMS (Content Mangement System). My website shows different workout routines,which includes cardio, streangth training and yoga and having its own pages for each exercise. Furthermore,
the website hasa blog section where I share my previous lab writeups and future ones, and technology related blog posts I have made. The project scope has changed alot by the implementation of dynamic content fetching, modern web development practices, custom modes and other interactive features.

## Technologies I have ed
- **Eleventy (11ty)**: Static Site Generator used to build the web pages.
- **Strapi**: Headless CMS used for managing workout and blog content.
- **Handlebars**: Templating engine used for creating dynamic HTML templates.
- **Sass**: CSS pre-processor used for advanced styling.
- **Bootstrap**: Frontend framework used for layout and component styling.
- **JavaScript**: For dynamic behavior in templates.

## Features Implemented
1. **API Interaction**: Content for workouts and blogs is fetched from Strapi using RESTful APIs. The data is then rendered at build-time using Eleventy collections.

2. **Content Modeling**: Content in Strapi is structured into different types, including:
   - **Workouts**: Cardio, Strength Training, and Yoga, each containing exercises.
   - **Exercises**: Individual exercises with details like name, description, and image.
   - **Blog Posts**: Posts for lab write-ups and additional career-related content.

3. **Data Fetching**: Data is fetched at build-time from Strapi via `axios` and integrated into Eleventy collections for rendering pages dynamically.

4. **Template Design**: Handlebars templates are used for rendering dynamic workout and exercise pages. Templates include:
   - **Exercise Detail Page**: Displays exercise details such as name, description, and images with graceful fallbacks for missing data.
   - **Blog Page**: Lists blog posts with pagination controls to navigate between posts.

5. **Pagination and Filtering**: The project includes pagination for blog posts.

6. **Custom 404 Page**: A custom 404 page is implemented to handle unmatched routes, improving user experience.

7. **Sass Styling**: Custom styles are created using Sass, enhancing the design beyond standard Bootstrap components.

## Project Structure
- **src**: Main source files, including Handlebars templates, public assets, and CSS.
  - **_includes**: Layout and partial files used throughout the project.
  - **pages**: Static pages, such as `about.hbs` and `blog.hbs`.
  - **sections**: Templates for workout sections (Cardio, Strength Training, Yoga).
  - **workouts**: Templates for workout-specific pages.
- **public**: Assets such as CSS and images.
- **eleventy.config.js**: Configuration file for Eleventy, including data fetching, collections, and build tasks.

## Installation and Setup

1. **Install Dependencies**:
   ```sh
   npm install
   ```

2. **Start Strapi CMS**:
   - Navigate to the `my-strapi-project` directory and start Strapi.
   ```sh
   cd my-strapi-project
   npm run develop
   ```

3. **Run Eleventy**:
   - In the root directory, build and serve the Eleventy site.
   ```sh
   npm run build
   npm run serve
   ```

## Content Management
The content for workouts and blog posts is managed through Strapi. To add new workouts, exercises, or blog posts:
1. **Access Strapi Admin Panel**: Start the Strapi project and navigate to `http://localhost:1337/admin`.
2. **Add/Edit Content**: Use the interface to manage content types.
3. **Fetch Updates**: Run `npm run build` to integrate new content into the static site.

## Deployment
- The project is built and outputted into the `dist` folder

## Attempt to add Filtering
There was alot of problems that arised with my attempt to content filter based on blog posts categories (category fields such as labs, fitness etc.)

Some challenges included:

**Dynamic Query Paramters**

I tried to use eleventy query to dynamically filter blog pots based on its category type.

Therefore using pagnation.before logic to filter these posts.

```html
{% if query.category and query.category != "All" %}
  collections.blogPosts.filter(item => item.category === query.category)
{% else %}
  collections.blogPosts
{% endif %}

```

The logic was to only make sure the posts in the selected category would display itself.

I then created a dropdown form and the links of the panginaton was fixed to pass the category query parameter.

```html
<form action="/blog/page/0/" method="GET">
  <select name="category" onchange="this.form.submit()">
    <option value="All" {{#if (eq query.category "All")}}selected{{/if}}>All Categories</option>
    <option value="Labs" {{#if (eq query.category "Labs")}}selected{{/if}}>Labs</option>
    <option value="Technology" {{#if (eq query.category "Technology")}}selected{{/if}}>Technology</option>
    <option value="Fitness" {{#if (eq query.category "Fitness")}}selected{{/if}}>Fitness</option>
  </select>
</form>
```

I also tried updating all the pagination links to include the category query parameter itself.

```html
<a href="{{ pagination.href.previous }}?category={{query.category}}" class="pagination-prev">Previous</a>

```

**Overall**

The main problems that I encountered was the filtering logic was not applying despite using pagination.before and the query.category was not being properly recognized when the build process happened, the selected category was not passed between pages which caused the filtering logic to break.