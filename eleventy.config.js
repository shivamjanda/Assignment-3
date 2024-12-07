const handlebars = require("handlebars");
const fs = require("fs");
const sass = require("sass");
const axios = require("axios");
const markdownIt = require("markdown-it");
const path = require("path");
require('dotenv').config();

const apiUrl = process.env.STRAPI_API_URL;
const apiToken = process.env.STRAPI_API_TOKEN;


// Define the options for Markdown-It
const markdownItOptions = {
  html: true, // Enable HTML tags in the Markdown content
};

// Create a Markdown-It instance with the defined options
const md = markdownIt(markdownItOptions);

module.exports = function (eleventyConfig) {
  // Add a custom filter named "markdownify" to Eleventy's config
  // This filter takes content in Markdown format and renders it as HTML
  eleventyConfig.addFilter("markdownify", (content) => {
    return md.render(content); // Use Markdown-It to convert the Markdown content to HTML
  });

  // Add filter for slugs
  const slugify = require("slugify");
  eleventyConfig.addFilter("slug", (input) => slugify(input, { lower: true }));
  eleventyConfig.addFilter("eq", (a, b) => a === b);
  eleventyConfig.addFilter("increment", (value) => parseInt(value) + 1);
  eleventyConfig.addFilter("add", (a, b) => a + b);

  // Hook into the "beforeBuild" event to perform tasks before Eleventy starts building the project
  eleventyConfig.on("beforeBuild", () => {
    // Define the path to the "dist" folder that will be deleted before building
    const distFolder = "dist";
    // Check if the "dist" folder exists
    if (fs.existsSync(distFolder)) {
      // Delete the "dist" folder and all its contents recursively
      fs.rmSync(distFolder, { recursive: true });
      // Log a message to indicate that the "dist" folder has been deleted
      console.log("Deleted the 'dist' folder before building...");
    }
  });

  // Set custom BrowserSync configuration for handling a custom 404 page
  eleventyConfig.setBrowserSyncConfig({
    callbacks: {
      // Callback function that is executed when BrowserSync is ready
      ready: function (err, bs) {
        // Read the contents of the custom 404 HTML file located in the "dist" folder
        const content_404 = fs.readFileSync("dist/404.html");

        // Add a middleware to handle all unmatched routes (i.e., 404 errors)
        bs.addMiddleware("*", (req, res) => {
          // Set the HTTP status code to 404 and specify the content type as HTML
          res.writeHead(404, { "Content-Type": "text/html" });
          // Write the content of the custom 404 page as the response
          res.write(content_404);
          res.end(); // End the response
        });
      },
    },
  });

  // Hook into the "beforeBuild" event to compile SASS before Eleventy starts building the project
  eleventyConfig.on("beforeBuild", () => {
    // Log a message indicating the start of the SASS compilation process
    console.log("Compiling SASS to CSS...");
    // Compile the SASS file located at "src/public/scss/main.scss" into CSS
    const result = sass.compile("src/public/scss/main.scss");
    // Create the "dist/css" folder if it doesn't already exist (including any parent directories needed)
    fs.mkdirSync("dist/css", { recursive: true });
    // Write the compiled CSS to the "dist/css" folder as "main.css"
    fs.writeFileSync("dist/css/main.css", result.css);
  });


  // Define a custom Eleventy collection named "workoutPages" for fetching workouts from a Strapi CMS
  eleventyConfig.addCollection("workoutPages", async function (collectionApi) {
    try {
      // Send a GET request to fetch workout data from the Strapi API with a 5-second timeout
      const response = await axios.get(`${apiUrl}/api/workouts`, {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
        timeout: 5000,
      });

      // Log the entire response data to provide visibility of the fetched workouts data
      console.log("Fetched Workouts Data (Full Response):", response.data);

      // Check if the response contains the expected data format (an array in response.data.data)
      if (!response.data.data || !Array.isArray(response.data.data)) {
        console.error("Unexpected data format:", response.data);
        return []; // Return an empty array if the data format is unexpected
      }

      // Map the workout data to the desired format for the Eleventy collection
      return response.data.data.map((workout) => {
        // Extract title, slug, and description from each workout, providing fallback values if necessary
        const title = workout.Title || "Unknown Title";
        const slug = workout.Slug || "unknown-slug";
        const description =
          workout.Description?.[0]?.children?.[0]?.text ||
          "No description available";

        // Log each workout entry to verify the extracted details
        console.log("Workout Entry:", { title, slug, description });

        // Return an object representing a workout with relevant properties and a permalink
        return {
          id: workout.id,
          title: title,
          slug: slug,
          description: description,
          permalink: `/workouts/${slug}/`, // Define the URL for each workout page
        };
      });
    } catch (error) {
      // Log an error if the API request fails
      console.error("Failed to fetch workouts from Strapi:", error);
      return []; // Return an empty array in case of an error
    }
  });

  // Define collection specifically for Cardio workouts
  eleventyConfig.addCollection(
    "cardioWorkoutsCollection",
    async function (collectionApi) {
      try {
        // Fetch workout data from Strapi CMS for the 'cardio' slug with a timeout of 5 seconds
        const response = await axios.get(
          `${apiUrl}/api/workouts?filters[Slug][$eq]=cardio`,
          { headers: {
            Authorization: `Bearer ${apiToken}`,
          },
            timeout: 5000 

          }
        );

        // Check if the response contains valid data; if not, log an error and return an empty array
        if (!response.data.data || response.data.data.length === 0) {
          console.error("Cardio data missing or empty:", response.data);
          return [];
        }

        // Extract the first workout object from the response
        const workout = response.data.data[0];

        // Return an array containing the workout object as required by Eleventy collections
        return [
          {
            id: workout.id, // Unique identifier for the workout
            title: workout.Title, // Title of the workout
            slug: workout.Slug, // Slug used for URLs
            description:
              workout.Description?.[0]?.children?.[0]?.text ||
              "No description available", // Extracted description text
          },
        ];
      } catch (error) {
        // Log an error message if the fetch request fails and return an empty array
        console.error("Failed to fetch cardio workout from Strapi:", error);
        return [];
      }
    }
  );

  // Define a collection for fetching Cardio Exercises
  eleventyConfig.addCollection("cardioExercises", async function () {
    try {
      // Fetch cardio exercises from Strapi, filtering by the related workout slug ('cardio')
      // Also populate the image field to get the image URL, with a timeout of 5 seconds
      const response = await axios.get(
        `${apiUrl}/api/exercises?filters[workout][Slug][$eq]=cardio&populate[Image][fields]=url`,
        { 
          headers: {
            Authorization: `Bearer ${apiToken}`,
          },
          timeout: 5000 

        }
      );

      // Log the full response data for debugging to ensure images are being returned correctly
      console.log(
        "Full Cardio Exercises Response:",
        JSON.stringify(response.data, null, 2)
      );

      // Check if the response contains valid data; if not, log an error and return an empty array
      if (!response.data.data || response.data.data.length === 0) {
        console.error("No cardio exercises found");
        return [];
      }

      // Map over the exercise data to transform it into the desired structure
      return response.data.data.map((exercise) => {
        const attributes = exercise.attributes || exercise;

        // Extract the exercise description; fallback if not available
        const description =
          attributes.Description?.[0]?.children?.[0]?.text ||
          "No description available";

        // Extract the image URL and construct the full path
        const imageUrl = attributes.Image?.url;
        const fullUrl = imageUrl
          ? `${apiUrl}${imageUrl}`
          : "/css/default-exercise.png";

        // Log the exercise name and image URL for debugging purposes
        console.log(`Exercise: ${attributes.Name}, Image URL: ${imageUrl}`);

        return {
          id: exercise.id, // Unique ID for the exercise
          name: attributes.Name || "Unnamed Exercise", // Exercise name with fallback
          exerciseSlug: attributes.Slug || "no-slug", // Slug for URL
          description, // Exercise description
          image: fullUrl, // Full image URL
        };
      });
    } catch (error) {
      // Log an error message if the fetch request fails and return an empty array
      console.error("Failed to fetch cardio exercises from Strapi:", error);
      return [];
    }
  });

  // Strength Training Collection
  eleventyConfig.addCollection(
    "strengthTrainingWorkoutsCollection",
    async function () {
      try {
        // Fetch workout data from Strapi for the 'strength-training' slug with a timeout of 5 seconds
        const response = await axios.get(
          `${apiUrl}/api/workouts?filters[Slug][$eq]=strength-training`,
          { 
            headers: {
              Authorization: `Bearer ${apiToken}`,
            },
            timeout: 5000 

          }
        );

        // Log the response data for debugging purposes to verify data fetching
        console.log(
          "Fetched Strength Training Workout Data (Response):",
          response.data
        );

        // Check if the response contains valid data; if not, log an error and return an empty array
        if (!response.data.data || response.data.data.length === 0) {
          console.error(
            "Strength Training data missing or empty:",
            response.data
          );
          return [];
        }

        // Extract the first workout object from the response
        const workout = response.data.data[0];

        // Return an array containing the workout object as required by Eleventy collections
        return [
          {
            id: workout.id, // Unique identifier for the workout
            title: workout.Title, // Title of the workout
            slug: workout.Slug, // Slug used for URLs
            description:
              workout.Description?.[0]?.children?.[0]?.text ||
              "No description available", // Extracted description text
          },
        ];
      } catch (error) {
        // Log an error message if the fetch request fails and return an empty array
        console.error(
          "Failed to fetch strength training workout from Strapi:",
          error
        );
        return [];
      }
    }
  );

  // Strength Training Exercises Collection
  eleventyConfig.addCollection("strengthTrainingExercises", async function () {
    try {
      // Fetch strength training exercises from Strapi, filtering by the related workout slug ('strength-training')
      // Also populate the image field to get the image URL, with a timeout of 5 seconds
      const response = await axios.get(
        `${apiUrl}/api/exercises?filters[workout][Slug][$eq]=strength-training&populate[Image][fields]=url`,
        { 
          headers: {
            Authorization: `Bearer ${apiToken}`,
          },
          timeout: 5000 

        }
      );

      // Log the full response data for debugging to ensure images are being returned correctly
      console.log(
        "Full Strength Training Exercises Response:",
        JSON.stringify(response.data, null, 2)
      );

      // Check if the response contains valid data; if not, log an error and return an empty array
      if (!response.data.data || response.data.data.length === 0) {
        console.error("No Strength Training exercises found");
        return [];
      }

      // Map over the exercise data to transform it into the desired structure
      return response.data.data.map((exercise) => {
        const attributes = exercise.attributes || exercise;

        // Extract the exercise description; fallback if not available
        const description =
          attributes.Description?.[0]?.children?.[0]?.text ||
          "No description available";

        // Extract the image URL and construct the full path
        const imageUrl = attributes.Image?.url;
        const fullUrl = imageUrl
          ? `${apiUrl}${imageUrl}`
          : "/css/default-exercise.png";

        // Log the exercise name and image URL for debugging purposes
        console.log("image url:", imageUrl);
        console.log(`Exercise: ${attributes.Name}, Image URL: ${imageUrl}`);

        return {
          id: exercise.id, // Unique ID for the exercise
          name: attributes.Name || "Unnamed Exercise", // Exercise name with fallback
          exerciseSlug: attributes.Slug || "no-slug", // Slug for URL
          description, // Exercise description
          image: fullUrl, // Full image URL or default image
        };
      });
    } catch (error) {
      // Log an error message if the fetch request fails and return an empty array
      console.error(
        "Failed to fetch Strength Training exercises from Strapi:",
        error
      );
      return [];
    }
  });

  // Yoga Collection
  eleventyConfig.addCollection("yogaWorkoutsCollection", async function () {
    try {
      // Fetch yoga workout data from Strapi for the 'yoga' slug with a timeout of 5 seconds
      const response = await axios.get(
        `${apiUrl}/api/workouts?filters[Slug][$eq]=yoga`,
        { 
          headers: {
            Authorization: `Bearer ${apiToken}`,
          },
          timeout: 5000 

        }
      );

      // Check if the response contains valid data; if not, log an error and return an empty array
      if (!response.data.data || response.data.data.length === 0) {
        console.error("Yoga data missing or empty:", response.data);
        return [];
      }

      // Extract the first workout object from the response
      const workout = response.data.data[0];

      // Log the extracted workout data for debugging purposes
      console.log("Yoga Workout Extracted Data:", workout);

      // Return an array containing the workout object as required by Eleventy collections
      return [
        {
          id: workout.id, // Unique identifier for the workout
          title: workout.Title, // Title of the workout
          slug: workout.Slug, // Slug used for URLs
          description:
            workout.Description?.[0]?.children?.[0]?.text ||
            "No description available", // Extracted description text
        },
      ];
    } catch (error) {
      // Log an error message if the fetch request fails and return an empty array
      console.error("Failed to fetch yoga workout from Strapi:", error);
      return [];
    }
  });

  // Yoga Exercises Collection
  eleventyConfig.addCollection("yogaExercises", async function () {
    try {
      // Fetch yoga exercises from Strapi, filtering by the related workout slug ('yoga')
      // Also populate the image field to get the image URL, with a timeout of 5 seconds
      const response = await axios.get(
        `${apiUrl}/api/exercises?filters[workout][Slug][$eq]=yoga&populate[Image][fields]=url`,
        { 
          headers: {
            Authorization: `Bearer ${apiToken}`,
          },
          timeout: 5000 
        }
      );

      // Log the full response data for debugging to ensure images are being returned correctly
      console.log(
        "Full Yoga Exercises Response:",
        JSON.stringify(response.data, null, 2)
      );

      // Check if the response contains valid data; if not, log an error and return an empty array
      if (!response.data.data || response.data.data.length === 0) {
        console.error("No Yoga exercises found");
        return [];
      }

      // Map over the exercise data to transform it into the desired structure
      return response.data.data.map((exercise) => {
        const attributes = exercise.attributes || exercise;

        // Extract the exercise description; fallback if not available
        const description =
          attributes.Description?.[0]?.children?.[0]?.text ||
          "No description available";

        // Extract the image URL and construct the full path
        const imageUrl = attributes.Image?.url;
        const fullUrl = imageUrl
          ? `http://127.0.0.1:1337${imageUrl}`
          : "/css/default-exercise.png";

        // Log the exercise name and image URL for debugging purposes
        console.log("image url:", imageUrl);
        console.log(`Exercise: ${attributes.Name}, Image URL: ${imageUrl}`);

        return {
          id: exercise.id, // Unique ID for the exercise
          name: attributes.Name || "Unnamed Exercise", // Exercise name with fallback
          exerciseSlug: attributes.Slug || "no-slug", // Slug for URL
          description, // Exercise description
          image: fullUrl, // Full image URL or default image if missing
        };
      });
    } catch (error) {
      // Log an error message if the fetch request fails and return an empty array
      console.error("Failed to fetch Yoga exercises from Strapi:", error);
      return [];
    }
  });

  // Collection to get all pages in the Eleventy project
  eleventyConfig.addCollection("allPages", function (collectionApi) {
    // Retrieve all pages and log the URL of each page for debugging
    return collectionApi.getAll().map((page) => {
      console.log(`Generated Page: ${page.url}`); // Log each page's URL to the console
      return page; // Return the page object
    });
  });

  // Blog Posts Collection
  eleventyConfig.addCollection("blogPosts", async function () {
    try {
      // Fetch blog posts from Strapi with a timeout of 5 seconds
      const response = await axios.get(`${apiUrl}/api/blog-posts`, {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
        timeout: 5000,
        
      });
      console.log("API Response:", JSON.stringify(response.data, null, 2)); // Log the full response


      // Check if the response data is valid and in the expected format; if not, log an error and return an empty array
      if (!response.data.data || !Array.isArray(response.data.data)) {
        console.error("Unexpected data format:", response.data);
        return [];
      }

      // Map over the blog post data to transform it into the desired structure
      return (
        response.data.data
          .map((post) => {
            // Extract blog post details with fallbacks for missing data
            const title = post?.Title || "Unknown Title";
            const slug = post?.Slug || "unknown-slug";
            const content = post?.Content || "No description available";
            const date = new Date(post?.DataTime || "1970-01-01"); // Convert date string to Date object
            const category = post.Category  || "Unknown Category"
            
            return {
              id: post.id, // Unique ID for the post
              title: title, // Title of the post
              slug: slug, // Slug for URL
              content: content, // Blog content
              date: date, // Date of the post
              category: category,
              permalink: `/blog/${slug}/`, // Permalink for the post
            };
          })
          // Sort blog posts by date in descending order (newest first)
          .sort((a, b) => b.date - a.date)
      );
    } catch (error) {
      // Log an error message if the fetch request fails and return an empty array
      console.error("Failed to fetch blog posts from Strapi:", error);
      return [];
    }
  });

  // Paginated Blog Posts Collection
  eleventyConfig.addCollection("paginatedBlogPosts", function (collectionApi) {
    // Retrieve all items tagged as "blogPosts" from the collection
    // This will be used for pagination purposes
    return collectionApi.getFilteredByTag("blogPosts");
  });


  const querystring = require("querystring");

  eleventyConfig.addShortcode("getCategoryFilter", (query) => {
    const parsedQuery = querystring.parse(query);
    return parsedQuery.category || "All";
  });
  

  const handlebars = require("handlebars");

  eleventyConfig.addHandlebarsHelper("eq", function (arg1, arg2) {
    return arg1 === arg2;
  });




  // Adding collections for filtering specific workouts (e.g., Yoga, Cardio, Strength Training)
  eleventyConfig.addCollection("filteredExercises", async function () {
    try {
      const response = await axios.get("http://127.0.0.1:1337/api/exercises", {
        timeout: 5000,
      });

      if (!response.data.data || response.data.data.length === 0) {
        console.error("Exercises data missing or empty:", response.data);
        return [];
      }

      return response.data.data.map((exercise) => {
        const exerciseType = exercise.Type; // Assuming 'Type' field identifies yoga, cardio, etc.
        const imageUrl =
          exercise.Image && exercise.Image.length > 0
            ? `http://127.0.0.1:1337${exercise.Image[0].url}`
            : null;

        return {
          id: exercise.id,
          name: exercise.Name,
          exerciseSlug: exercise.Slug,
          type: exerciseType, // Yoga, Cardio, Strength Training
          description:
            exercise.Description?.[0]?.children?.[0]?.text ||
            "No description available",
          image: imageUrl,
        };
      });
    } catch (error) {
      console.error("Failed to fetch exercises from Strapi:", error);
      return [];
    }
  });




  module.exports = function (eleventyConfig) {
    eleventyConfig.addPassthroughCopy({ "src/public/css": "css" });
  };

  // Copy public assets (CSS, images, etc.) to the 'dist' folder
  eleventyConfig.addPassthroughCopy({ "src/public/css": "css" });

  // Watch the CSS folder for changes and trigger rebuild
  eleventyConfig.addWatchTarget("src/public/css");

  // Directory configuration for input and output
  return {
    dir: {
      input: ".",
      input: "src",
      layouts: "_includes",
      output: "dist",
      includes: "_includes",
      data: "_data",
    },
  };
};
