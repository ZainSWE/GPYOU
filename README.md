# GPYOU

## Overview
GPYOU is an interactive Gemini Flash 2.0 powered web application that guides users toward the ideal graphics card based on their personal needs, budget, and performance expectations. Built in under 48 hours during the GDSC Guelph 2025 Hackathon, the project focuses on delivering clear and accessible GPU recommendations without requiring technical knowledge.

The platform simplifies complex GPU specifications into an intuitive question based flow that anyone can understand. Users answer four simple questions and receive a curated GPU recommendation with price ranges, performance tiers, and additional model comparisons. GPYOU earned the category award for Best User Interface thanks to its clean design, clear visuals, and smooth user experience.

## Live Demo
Access the full web app here  
https://zainswe.github.io/GPYOU/src/

<br>
Or check out our Devpost below
<br>
https://devpost.com/software/gpyou

## Key Features
### Smart GPU Recommendation System
GPYOU analyzes four non technical user inputs including needs, performance expectations, resolution goals, and budget preferences. Using those inputs the app determines an ideal GPU tier and presents a clear and concise recommendation with supporting information.

### Clean and Accessible UI
The interface emphasizes clarity, ease of use, and smooth interaction. All pages are structured for quick decision making without overwhelming users with technical jargon. The design is mobile friendly and optimized for both speed and simplicity.

### GPU Tier Visualization
GPYOU organizes graphics cards into understandable performance tiers. Users can understand where each recommended GPU stands in relation to higher and lower performance options which makes comparison easier for non technical audiences.

### Zero Install Web Experience
The entire application runs directly in the browser with no setup required. It is hosted through GitHub Pages which ensures fast and consistent access across devices.

### Fast Response Logic
The app uses a lightweight logic model to generate instant recommendations. Results are computed on the client side which keeps the experience responsive and frictionless.

## Tech Stack
### Frontend
HTML  
CSS  
JavaScript  

### Backend Logic
Custom client side recommendation engine built around tier mapping and user requirement matching  
Powered by Gemini Flash 2.0 for data assistance and structured reasoning during development

### Deployment
GitHub Pages for hosting and continuous updates

## How It Works
GPYOU presents the user with four guided questions covering use case, performance demands, visual expectations, and budget range. From those inputs the logic engine selects an appropriate GPU tier and returns a polished results screen that includes  
A recommended GPU  
Price expectations  
Reasoning behind the choice  
Tier information and performance context  

Below is a set of previews demonstrating the user flow and interface

<img src="image%20previews/ss1.png">
<img src="image%20previews/ss2.png">
<img src="image%20previews/ss3.png">
<img src="image%20previews/ss4.png">
<img src="image%20previews/ss5.png">

## Project Structure
