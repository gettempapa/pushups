import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL?.replace(/\\n/g, '').trim();
const supabaseKey = process.env.SUPABASE_ANON_KEY?.replace(/\\n/g, '').trim();

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const foods = [
  // TIER 1: TOP OF PYRAMID (+10 points)
  // Beef
  { name: 'Steak (ribeye)', category: 'Protein', subcategory: 'Beef', tier: 1, points: 10 },
  { name: 'Steak (sirloin)', category: 'Protein', subcategory: 'Beef', tier: 1, points: 10 },
  { name: 'Steak (filet mignon)', category: 'Protein', subcategory: 'Beef', tier: 1, points: 10 },
  { name: 'Steak (NY strip)', category: 'Protein', subcategory: 'Beef', tier: 1, points: 10 },
  { name: 'Steak (flank)', category: 'Protein', subcategory: 'Beef', tier: 1, points: 10 },
  { name: 'Ground beef', category: 'Protein', subcategory: 'Beef', tier: 1, points: 10 },
  { name: 'Beef roast', category: 'Protein', subcategory: 'Beef', tier: 1, points: 10 },
  { name: 'Beef liver', category: 'Protein', subcategory: 'Beef', tier: 1, points: 10 },
  { name: 'Brisket', category: 'Protein', subcategory: 'Beef', tier: 1, points: 10 },

  // Poultry
  { name: 'Chicken breast', category: 'Protein', subcategory: 'Poultry', tier: 1, points: 10 },
  { name: 'Chicken thigh', category: 'Protein', subcategory: 'Poultry', tier: 1, points: 10 },
  { name: 'Chicken drumstick', category: 'Protein', subcategory: 'Poultry', tier: 1, points: 10 },
  { name: 'Chicken wings (plain)', category: 'Protein', subcategory: 'Poultry', tier: 1, points: 10 },
  { name: 'Whole roasted chicken', category: 'Protein', subcategory: 'Poultry', tier: 1, points: 10 },
  { name: 'Ground chicken', category: 'Protein', subcategory: 'Poultry', tier: 1, points: 10 },
  { name: 'Turkey breast', category: 'Protein', subcategory: 'Poultry', tier: 1, points: 10 },
  { name: 'Ground turkey', category: 'Protein', subcategory: 'Poultry', tier: 1, points: 10 },
  { name: 'Turkey leg', category: 'Protein', subcategory: 'Poultry', tier: 1, points: 10 },
  { name: 'Duck breast', category: 'Protein', subcategory: 'Poultry', tier: 1, points: 10 },

  // Fish & Seafood
  { name: 'Salmon (wild-caught)', category: 'Protein', subcategory: 'Fish', tier: 1, points: 10 },
  { name: 'Salmon (Atlantic)', category: 'Protein', subcategory: 'Fish', tier: 1, points: 10 },
  { name: 'Sardines', category: 'Protein', subcategory: 'Fish', tier: 1, points: 10 },
  { name: 'Mackerel', category: 'Protein', subcategory: 'Fish', tier: 1, points: 10 },
  { name: 'Tuna (fresh)', category: 'Protein', subcategory: 'Fish', tier: 1, points: 10 },
  { name: 'Tuna (canned)', category: 'Protein', subcategory: 'Fish', tier: 1, points: 10 },
  { name: 'Cod', category: 'Protein', subcategory: 'Fish', tier: 1, points: 10 },
  { name: 'Halibut', category: 'Protein', subcategory: 'Fish', tier: 1, points: 10 },
  { name: 'Trout', category: 'Protein', subcategory: 'Fish', tier: 1, points: 10 },
  { name: 'Sea bass', category: 'Protein', subcategory: 'Fish', tier: 1, points: 10 },
  { name: 'Shrimp', category: 'Protein', subcategory: 'Seafood', tier: 1, points: 10 },
  { name: 'Lobster', category: 'Protein', subcategory: 'Seafood', tier: 1, points: 10 },
  { name: 'Crab', category: 'Protein', subcategory: 'Seafood', tier: 1, points: 10 },
  { name: 'Scallops', category: 'Protein', subcategory: 'Seafood', tier: 1, points: 10 },
  { name: 'Mussels', category: 'Protein', subcategory: 'Seafood', tier: 1, points: 10 },
  { name: 'Oysters', category: 'Protein', subcategory: 'Seafood', tier: 1, points: 10 },

  // Pork
  { name: 'Pork chop', category: 'Protein', subcategory: 'Pork', tier: 1, points: 10 },
  { name: 'Pork tenderloin', category: 'Protein', subcategory: 'Pork', tier: 1, points: 10 },
  { name: 'Pork loin', category: 'Protein', subcategory: 'Pork', tier: 1, points: 10 },
  { name: 'Ground pork', category: 'Protein', subcategory: 'Pork', tier: 1, points: 10 },
  { name: 'Ham (uncured)', category: 'Protein', subcategory: 'Pork', tier: 1, points: 10 },

  // Other Meats
  { name: 'Lamb chop', category: 'Protein', subcategory: 'Lamb', tier: 1, points: 10 },
  { name: 'Ground lamb', category: 'Protein', subcategory: 'Lamb', tier: 1, points: 10 },
  { name: 'Bison', category: 'Protein', subcategory: 'Game', tier: 1, points: 10 },
  { name: 'Venison', category: 'Protein', subcategory: 'Game', tier: 1, points: 10 },

  // Eggs
  { name: 'Eggs (whole)', category: 'Protein', subcategory: 'Eggs', tier: 1, points: 10 },
  { name: 'Egg whites', category: 'Protein', subcategory: 'Eggs', tier: 1, points: 10 },

  // Cheese
  { name: 'Cheddar cheese', category: 'Dairy', subcategory: 'Cheese', tier: 1, points: 10 },
  { name: 'Parmesan cheese', category: 'Dairy', subcategory: 'Cheese', tier: 1, points: 10 },
  { name: 'Mozzarella cheese', category: 'Dairy', subcategory: 'Cheese', tier: 1, points: 10 },
  { name: 'Gouda cheese', category: 'Dairy', subcategory: 'Cheese', tier: 1, points: 10 },
  { name: 'Brie cheese', category: 'Dairy', subcategory: 'Cheese', tier: 1, points: 10 },
  { name: 'Swiss cheese', category: 'Dairy', subcategory: 'Cheese', tier: 1, points: 10 },
  { name: 'Feta cheese', category: 'Dairy', subcategory: 'Cheese', tier: 1, points: 10 },
  { name: 'Blue cheese', category: 'Dairy', subcategory: 'Cheese', tier: 1, points: 10 },
  { name: 'Goat cheese', category: 'Dairy', subcategory: 'Cheese', tier: 1, points: 10 },
  { name: 'Cottage cheese', category: 'Dairy', subcategory: 'Cheese', tier: 1, points: 10 },
  { name: 'Cream cheese', category: 'Dairy', subcategory: 'Cheese', tier: 1, points: 10 },
  { name: 'Ricotta cheese', category: 'Dairy', subcategory: 'Cheese', tier: 1, points: 10 },

  // Dairy
  { name: 'Whole milk', category: 'Dairy', subcategory: 'Milk', tier: 1, points: 10 },
  { name: 'Heavy cream', category: 'Dairy', subcategory: 'Cream', tier: 1, points: 10 },
  { name: 'Greek yogurt (plain)', category: 'Dairy', subcategory: 'Yogurt', tier: 1, points: 10 },
  { name: 'Butter', category: 'Dairy', subcategory: 'Butter', tier: 1, points: 10 },
  { name: 'Ghee', category: 'Dairy', subcategory: 'Butter', tier: 1, points: 10 },
  { name: 'Sour cream', category: 'Dairy', subcategory: 'Cream', tier: 1, points: 10 },
  { name: 'Kefir (plain)', category: 'Dairy', subcategory: 'Fermented', tier: 1, points: 10 },

  // Healthy Fats
  { name: 'Olive oil', category: 'Fats', subcategory: 'Oil', tier: 1, points: 10 },
  { name: 'Avocado oil', category: 'Fats', subcategory: 'Oil', tier: 1, points: 10 },
  { name: 'Coconut oil', category: 'Fats', subcategory: 'Oil', tier: 1, points: 10 },

  // Nuts
  { name: 'Almonds', category: 'Fats', subcategory: 'Nuts', tier: 1, points: 10 },
  { name: 'Walnuts', category: 'Fats', subcategory: 'Nuts', tier: 1, points: 10 },
  { name: 'Macadamia nuts', category: 'Fats', subcategory: 'Nuts', tier: 1, points: 10 },
  { name: 'Pecans', category: 'Fats', subcategory: 'Nuts', tier: 1, points: 10 },
  { name: 'Brazil nuts', category: 'Fats', subcategory: 'Nuts', tier: 1, points: 10 },
  { name: 'Cashews', category: 'Fats', subcategory: 'Nuts', tier: 1, points: 10 },
  { name: 'Pistachios', category: 'Fats', subcategory: 'Nuts', tier: 1, points: 10 },

  // Seeds
  { name: 'Chia seeds', category: 'Fats', subcategory: 'Seeds', tier: 1, points: 10 },
  { name: 'Flax seeds', category: 'Fats', subcategory: 'Seeds', tier: 1, points: 10 },
  { name: 'Pumpkin seeds', category: 'Fats', subcategory: 'Seeds', tier: 1, points: 10 },
  { name: 'Sunflower seeds', category: 'Fats', subcategory: 'Seeds', tier: 1, points: 10 },
  { name: 'Hemp seeds', category: 'Fats', subcategory: 'Seeds', tier: 1, points: 10 },

  // Non-starchy Vegetables
  { name: 'Broccoli', category: 'Vegetables', subcategory: 'Cruciferous', tier: 1, points: 10 },
  { name: 'Cauliflower', category: 'Vegetables', subcategory: 'Cruciferous', tier: 1, points: 10 },
  { name: 'Brussels sprouts', category: 'Vegetables', subcategory: 'Cruciferous', tier: 1, points: 10 },
  { name: 'Cabbage', category: 'Vegetables', subcategory: 'Cruciferous', tier: 1, points: 10 },
  { name: 'Kale', category: 'Vegetables', subcategory: 'Leafy Greens', tier: 1, points: 10 },
  { name: 'Spinach', category: 'Vegetables', subcategory: 'Leafy Greens', tier: 1, points: 10 },
  { name: 'Arugula', category: 'Vegetables', subcategory: 'Leafy Greens', tier: 1, points: 10 },
  { name: 'Romaine lettuce', category: 'Vegetables', subcategory: 'Leafy Greens', tier: 1, points: 10 },
  { name: 'Swiss chard', category: 'Vegetables', subcategory: 'Leafy Greens', tier: 1, points: 10 },
  { name: 'Collard greens', category: 'Vegetables', subcategory: 'Leafy Greens', tier: 1, points: 10 },
  { name: 'Asparagus', category: 'Vegetables', subcategory: 'Green', tier: 1, points: 10 },
  { name: 'Green beans', category: 'Vegetables', subcategory: 'Green', tier: 1, points: 10 },
  { name: 'Zucchini', category: 'Vegetables', subcategory: 'Squash', tier: 1, points: 10 },
  { name: 'Cucumber', category: 'Vegetables', subcategory: 'Green', tier: 1, points: 10 },
  { name: 'Celery', category: 'Vegetables', subcategory: 'Green', tier: 1, points: 10 },
  { name: 'Bell pepper', category: 'Vegetables', subcategory: 'Pepper', tier: 1, points: 10 },
  { name: 'Mushrooms', category: 'Vegetables', subcategory: 'Fungi', tier: 1, points: 10 },
  { name: 'Tomato', category: 'Vegetables', subcategory: 'Nightshade', tier: 1, points: 10 },
  { name: 'Onion', category: 'Vegetables', subcategory: 'Allium', tier: 1, points: 10 },
  { name: 'Garlic', category: 'Vegetables', subcategory: 'Allium', tier: 1, points: 10 },
  { name: 'Eggplant', category: 'Vegetables', subcategory: 'Nightshade', tier: 1, points: 10 },
  { name: 'Artichoke', category: 'Vegetables', subcategory: 'Thistle', tier: 1, points: 10 },
  { name: 'Avocado', category: 'Vegetables', subcategory: 'Fruit', tier: 1, points: 10 },
  { name: 'Sauerkraut', category: 'Vegetables', subcategory: 'Fermented', tier: 1, points: 10 },
  { name: 'Kimchi', category: 'Vegetables', subcategory: 'Fermented', tier: 1, points: 10 },

  // TIER 2: UPPER PYRAMID (+7 points)
  // Berries
  { name: 'Blueberries', category: 'Fruit', subcategory: 'Berries', tier: 2, points: 7 },
  { name: 'Strawberries', category: 'Fruit', subcategory: 'Berries', tier: 2, points: 7 },
  { name: 'Raspberries', category: 'Fruit', subcategory: 'Berries', tier: 2, points: 7 },
  { name: 'Blackberries', category: 'Fruit', subcategory: 'Berries', tier: 2, points: 7 },
  { name: 'Cranberries', category: 'Fruit', subcategory: 'Berries', tier: 2, points: 7 },

  // Citrus
  { name: 'Orange', category: 'Fruit', subcategory: 'Citrus', tier: 2, points: 7 },
  { name: 'Grapefruit', category: 'Fruit', subcategory: 'Citrus', tier: 2, points: 7 },
  { name: 'Lemon', category: 'Fruit', subcategory: 'Citrus', tier: 2, points: 7 },
  { name: 'Lime', category: 'Fruit', subcategory: 'Citrus', tier: 2, points: 7 },

  // Other Fruits
  { name: 'Apple', category: 'Fruit', subcategory: 'Pome', tier: 2, points: 7 },
  { name: 'Pear', category: 'Fruit', subcategory: 'Pome', tier: 2, points: 7 },
  { name: 'Peach', category: 'Fruit', subcategory: 'Stone', tier: 2, points: 7 },
  { name: 'Plum', category: 'Fruit', subcategory: 'Stone', tier: 2, points: 7 },
  { name: 'Cherry', category: 'Fruit', subcategory: 'Stone', tier: 2, points: 7 },
  { name: 'Grapes', category: 'Fruit', subcategory: 'Vine', tier: 2, points: 7 },
  { name: 'Kiwi', category: 'Fruit', subcategory: 'Tropical', tier: 2, points: 7 },
  { name: 'Mango', category: 'Fruit', subcategory: 'Tropical', tier: 2, points: 7 },
  { name: 'Pineapple', category: 'Fruit', subcategory: 'Tropical', tier: 2, points: 7 },
  { name: 'Papaya', category: 'Fruit', subcategory: 'Tropical', tier: 2, points: 7 },
  { name: 'Watermelon', category: 'Fruit', subcategory: 'Melon', tier: 2, points: 7 },
  { name: 'Cantaloupe', category: 'Fruit', subcategory: 'Melon', tier: 2, points: 7 },
  { name: 'Banana', category: 'Fruit', subcategory: 'Tropical', tier: 2, points: 7 },
  { name: 'Pomegranate', category: 'Fruit', subcategory: 'Other', tier: 2, points: 7 },

  // Legumes
  { name: 'Lentils', category: 'Legumes', subcategory: 'Lentils', tier: 2, points: 7 },
  { name: 'Black beans', category: 'Legumes', subcategory: 'Beans', tier: 2, points: 7 },
  { name: 'Kidney beans', category: 'Legumes', subcategory: 'Beans', tier: 2, points: 7 },
  { name: 'Chickpeas', category: 'Legumes', subcategory: 'Beans', tier: 2, points: 7 },
  { name: 'Pinto beans', category: 'Legumes', subcategory: 'Beans', tier: 2, points: 7 },
  { name: 'Navy beans', category: 'Legumes', subcategory: 'Beans', tier: 2, points: 7 },
  { name: 'Edamame', category: 'Legumes', subcategory: 'Soy', tier: 2, points: 7 },
  { name: 'Hummus', category: 'Legumes', subcategory: 'Prepared', tier: 2, points: 7 },

  // Plant Proteins
  { name: 'Tofu', category: 'Protein', subcategory: 'Plant', tier: 2, points: 7 },
  { name: 'Tempeh', category: 'Protein', subcategory: 'Plant', tier: 2, points: 7 },

  // TIER 3: MIDDLE PYRAMID (+5 points)
  { name: 'Sweet potato', category: 'Vegetables', subcategory: 'Starchy', tier: 3, points: 5 },
  { name: 'Potato', category: 'Vegetables', subcategory: 'Starchy', tier: 3, points: 5 },
  { name: 'Carrots', category: 'Vegetables', subcategory: 'Root', tier: 3, points: 5 },
  { name: 'Beets', category: 'Vegetables', subcategory: 'Root', tier: 3, points: 5 },
  { name: 'Parsnips', category: 'Vegetables', subcategory: 'Root', tier: 3, points: 5 },
  { name: 'Butternut squash', category: 'Vegetables', subcategory: 'Squash', tier: 3, points: 5 },
  { name: 'Acorn squash', category: 'Vegetables', subcategory: 'Squash', tier: 3, points: 5 },
  { name: 'Pumpkin', category: 'Vegetables', subcategory: 'Squash', tier: 3, points: 5 },
  { name: 'Corn', category: 'Vegetables', subcategory: 'Starchy', tier: 3, points: 5 },
  { name: 'Peas', category: 'Vegetables', subcategory: 'Starchy', tier: 3, points: 5 },
  { name: 'Dates', category: 'Fruit', subcategory: 'Dried', tier: 3, points: 5 },
  { name: 'Raisins', category: 'Fruit', subcategory: 'Dried', tier: 3, points: 5 },
  { name: 'Dried apricots', category: 'Fruit', subcategory: 'Dried', tier: 3, points: 5 },
  { name: 'Prunes', category: 'Fruit', subcategory: 'Dried', tier: 3, points: 5 },

  // TIER 4: LOWER PYRAMID (+3 points)
  { name: 'Quinoa', category: 'Grains', subcategory: 'Whole', tier: 4, points: 3 },
  { name: 'Brown rice', category: 'Grains', subcategory: 'Whole', tier: 4, points: 3 },
  { name: 'Oats', category: 'Grains', subcategory: 'Whole', tier: 4, points: 3 },
  { name: 'Oatmeal', category: 'Grains', subcategory: 'Whole', tier: 4, points: 3 },
  { name: 'Barley', category: 'Grains', subcategory: 'Whole', tier: 4, points: 3 },
  { name: 'Farro', category: 'Grains', subcategory: 'Whole', tier: 4, points: 3 },
  { name: 'Buckwheat', category: 'Grains', subcategory: 'Whole', tier: 4, points: 3 },
  { name: 'Whole wheat bread', category: 'Grains', subcategory: 'Bread', tier: 4, points: 3 },
  { name: 'Whole wheat pasta', category: 'Grains', subcategory: 'Pasta', tier: 4, points: 3 },
  { name: 'Ezekiel bread', category: 'Grains', subcategory: 'Bread', tier: 4, points: 3 },

  // TIER 5: BOTTOM OF PYRAMID (+1 point)
  { name: 'White rice', category: 'Grains', subcategory: 'Refined', tier: 5, points: 1 },
  { name: 'White bread', category: 'Grains', subcategory: 'Refined', tier: 5, points: 1 },
  { name: 'Pasta', category: 'Grains', subcategory: 'Refined', tier: 5, points: 1 },
  { name: 'Sourdough bread', category: 'Grains', subcategory: 'Refined', tier: 5, points: 1 },
  { name: 'Bagel', category: 'Grains', subcategory: 'Refined', tier: 5, points: 1 },
  { name: 'Tortilla (flour)', category: 'Grains', subcategory: 'Refined', tier: 5, points: 1 },
  { name: 'Tortilla (corn)', category: 'Grains', subcategory: 'Refined', tier: 5, points: 1 },
  { name: 'Crackers', category: 'Grains', subcategory: 'Refined', tier: 5, points: 1 },
  { name: 'Pretzels', category: 'Grains', subcategory: 'Refined', tier: 5, points: 1 },

  // ANTI-PYRAMID: LEVEL -5 (Mildly harmful, -2 points)
  { name: 'Diet Coke', category: 'Beverages', subcategory: 'Diet Soda', tier: -5, points: -2 },
  { name: 'Diet Pepsi', category: 'Beverages', subcategory: 'Diet Soda', tier: -5, points: -2 },
  { name: 'Coke Zero', category: 'Beverages', subcategory: 'Diet Soda', tier: -5, points: -2 },
  { name: 'Diet soda', category: 'Beverages', subcategory: 'Diet Soda', tier: -5, points: -2 },
  { name: 'Sugar-free gum', category: 'Snacks', subcategory: 'Sugar-free', tier: -5, points: -2 },
  { name: 'Splenda', category: 'Sweeteners', subcategory: 'Artificial', tier: -5, points: -2 },
  { name: 'Stevia', category: 'Sweeteners', subcategory: 'Artificial', tier: -5, points: -2 },
  { name: 'Skim milk', category: 'Dairy', subcategory: 'Low-fat', tier: -5, points: -2 },
  { name: 'Fat-free yogurt', category: 'Dairy', subcategory: 'Low-fat', tier: -5, points: -2 },
  { name: 'Light mayo', category: 'Condiments', subcategory: 'Low-fat', tier: -5, points: -2 },
  { name: 'Protein bar', category: 'Snacks', subcategory: 'Processed', tier: -5, points: -2 },
  { name: 'Quest bar', category: 'Snacks', subcategory: 'Processed', tier: -5, points: -2 },

  // ANTI-PYRAMID: LEVEL -4 (Moderately harmful, -4 points)
  { name: 'Potato chips', category: 'Snacks', subcategory: 'Chips', tier: -4, points: -4 },
  { name: "Lay's chips", category: 'Snacks', subcategory: 'Chips', tier: -4, points: -4 },
  { name: 'Doritos', category: 'Snacks', subcategory: 'Chips', tier: -4, points: -4 },
  { name: 'Cheetos', category: 'Snacks', subcategory: 'Chips', tier: -4, points: -4 },
  { name: 'Ritz crackers', category: 'Snacks', subcategory: 'Crackers', tier: -4, points: -4 },
  { name: 'Goldfish crackers', category: 'Snacks', subcategory: 'Crackers', tier: -4, points: -4 },
  { name: 'Instant ramen', category: 'Prepared', subcategory: 'Instant', tier: -4, points: -4 },
  { name: 'Cup Noodles', category: 'Prepared', subcategory: 'Instant', tier: -4, points: -4 },
  { name: 'Kraft Mac and Cheese', category: 'Prepared', subcategory: 'Boxed', tier: -4, points: -4 },
  { name: 'Frozen dinner', category: 'Prepared', subcategory: 'Frozen', tier: -4, points: -4 },
  { name: 'Hot Pocket', category: 'Prepared', subcategory: 'Frozen', tier: -4, points: -4 },
  { name: 'American cheese', category: 'Dairy', subcategory: 'Processed', tier: -4, points: -4 },
  { name: 'Velveeta', category: 'Dairy', subcategory: 'Processed', tier: -4, points: -4 },
  { name: 'Margarine', category: 'Fats', subcategory: 'Processed', tier: -4, points: -4 },
  { name: 'Ketchup', category: 'Condiments', subcategory: 'Sugary', tier: -4, points: -4 },
  { name: 'BBQ sauce', category: 'Condiments', subcategory: 'Sugary', tier: -4, points: -4 },
  { name: 'Ranch dressing', category: 'Condiments', subcategory: 'Processed', tier: -4, points: -4 },

  // ANTI-PYRAMID: LEVEL -3 (Harmful, -6 points)
  { name: "McDonald's Big Mac", category: 'Fast Food', subcategory: 'Burger', tier: -3, points: -6 },
  { name: 'Burger King Whopper', category: 'Fast Food', subcategory: 'Burger', tier: -3, points: -6 },
  { name: "Wendy's burger", category: 'Fast Food', subcategory: 'Burger', tier: -3, points: -6 },
  { name: 'Fast food burger', category: 'Fast Food', subcategory: 'Burger', tier: -3, points: -6 },
  { name: 'French fries', category: 'Fast Food', subcategory: 'Fried', tier: -3, points: -6 },
  { name: 'Chicken nuggets', category: 'Fast Food', subcategory: 'Fried', tier: -3, points: -6 },
  { name: 'Chicken tenders', category: 'Fast Food', subcategory: 'Fried', tier: -3, points: -6 },
  { name: 'Fried chicken', category: 'Fast Food', subcategory: 'Fried', tier: -3, points: -6 },
  { name: 'Chick-fil-A sandwich', category: 'Fast Food', subcategory: 'Chicken', tier: -3, points: -6 },
  { name: 'KFC', category: 'Fast Food', subcategory: 'Fried', tier: -3, points: -6 },
  { name: 'Pizza (fast food)', category: 'Fast Food', subcategory: 'Pizza', tier: -3, points: -6 },
  { name: "Domino's pizza", category: 'Fast Food', subcategory: 'Pizza', tier: -3, points: -6 },
  { name: 'Frozen pizza', category: 'Prepared', subcategory: 'Frozen', tier: -3, points: -6 },
  { name: 'Hot dog', category: 'Protein', subcategory: 'Processed', tier: -3, points: -6 },
  { name: 'Bologna', category: 'Protein', subcategory: 'Processed', tier: -3, points: -6 },
  { name: 'Bacon (processed)', category: 'Protein', subcategory: 'Processed', tier: -3, points: -6 },
  { name: 'Pepperoni', category: 'Protein', subcategory: 'Processed', tier: -3, points: -6 },
  { name: 'Deli meat', category: 'Protein', subcategory: 'Processed', tier: -3, points: -6 },
  { name: 'Fish sticks', category: 'Prepared', subcategory: 'Frozen', tier: -3, points: -6 },
  { name: 'Corn dog', category: 'Fast Food', subcategory: 'Fried', tier: -3, points: -6 },
  { name: 'Onion rings', category: 'Fast Food', subcategory: 'Fried', tier: -3, points: -6 },
  { name: 'Taco Bell', category: 'Fast Food', subcategory: 'Mexican', tier: -3, points: -6 },
  { name: 'Chipotle burrito', category: 'Fast Food', subcategory: 'Mexican', tier: -3, points: -6 },

  // ANTI-PYRAMID: LEVEL -2 (Very harmful, -8 points)
  { name: 'Oreos', category: 'Snacks', subcategory: 'Cookies', tier: -2, points: -8 },
  { name: 'Chips Ahoy', category: 'Snacks', subcategory: 'Cookies', tier: -2, points: -8 },
  { name: 'Cookies', category: 'Snacks', subcategory: 'Cookies', tier: -2, points: -8 },
  { name: 'Gatorade', category: 'Beverages', subcategory: 'Sports Drink', tier: -2, points: -8 },
  { name: 'Powerade', category: 'Beverages', subcategory: 'Sports Drink', tier: -2, points: -8 },
  { name: 'Orange juice', category: 'Beverages', subcategory: 'Juice', tier: -2, points: -8 },
  { name: 'Apple juice', category: 'Beverages', subcategory: 'Juice', tier: -2, points: -8 },
  { name: 'Fruit juice', category: 'Beverages', subcategory: 'Juice', tier: -2, points: -8 },
  { name: 'Chocolate milk', category: 'Dairy', subcategory: 'Sweetened', tier: -2, points: -8 },
  { name: 'Sweetened yogurt', category: 'Dairy', subcategory: 'Sweetened', tier: -2, points: -8 },
  { name: 'Yoplait yogurt', category: 'Dairy', subcategory: 'Sweetened', tier: -2, points: -8 },
  { name: 'Frappuccino', category: 'Beverages', subcategory: 'Coffee', tier: -2, points: -8 },
  { name: 'Pumpkin spice latte', category: 'Beverages', subcategory: 'Coffee', tier: -2, points: -8 },
  { name: 'Pancakes', category: 'Prepared', subcategory: 'Breakfast', tier: -2, points: -8 },
  { name: 'Waffles', category: 'Prepared', subcategory: 'Breakfast', tier: -2, points: -8 },
  { name: 'Eggo waffles', category: 'Prepared', subcategory: 'Frozen', tier: -2, points: -8 },
  { name: 'Pancake syrup', category: 'Condiments', subcategory: 'Sugary', tier: -2, points: -8 },
  { name: 'Granola bar', category: 'Snacks', subcategory: 'Bar', tier: -2, points: -8 },
  { name: 'Nature Valley bar', category: 'Snacks', subcategory: 'Bar', tier: -2, points: -8 },
  { name: 'Clif Bar', category: 'Snacks', subcategory: 'Bar', tier: -2, points: -8 },
  { name: 'Muffin', category: 'Snacks', subcategory: 'Baked', tier: -2, points: -8 },
  { name: 'Honey Nut Cheerios', category: 'Grains', subcategory: 'Cereal', tier: -2, points: -8 },
  { name: 'Frosted Mini-Wheats', category: 'Grains', subcategory: 'Cereal', tier: -2, points: -8 },

  // ANTI-PYRAMID: LEVEL -1 (Worst, -10 points)
  { name: 'Coca-Cola', category: 'Beverages', subcategory: 'Soda', tier: -1, points: -10 },
  { name: 'Pepsi', category: 'Beverages', subcategory: 'Soda', tier: -1, points: -10 },
  { name: 'Sprite', category: 'Beverages', subcategory: 'Soda', tier: -1, points: -10 },
  { name: 'Mountain Dew', category: 'Beverages', subcategory: 'Soda', tier: -1, points: -10 },
  { name: 'Dr Pepper', category: 'Beverages', subcategory: 'Soda', tier: -1, points: -10 },
  { name: 'Soda', category: 'Beverages', subcategory: 'Soda', tier: -1, points: -10 },
  { name: 'Red Bull', category: 'Beverages', subcategory: 'Energy', tier: -1, points: -10 },
  { name: 'Monster Energy', category: 'Beverages', subcategory: 'Energy', tier: -1, points: -10 },
  { name: 'Energy drink', category: 'Beverages', subcategory: 'Energy', tier: -1, points: -10 },
  { name: 'Snickers', category: 'Candy', subcategory: 'Chocolate', tier: -1, points: -10 },
  { name: 'M&Ms', category: 'Candy', subcategory: 'Chocolate', tier: -1, points: -10 },
  { name: 'Twix', category: 'Candy', subcategory: 'Chocolate', tier: -1, points: -10 },
  { name: 'Kit Kat', category: 'Candy', subcategory: 'Chocolate', tier: -1, points: -10 },
  { name: "Reese's", category: 'Candy', subcategory: 'Chocolate', tier: -1, points: -10 },
  { name: 'Candy bar', category: 'Candy', subcategory: 'Chocolate', tier: -1, points: -10 },
  { name: 'Skittles', category: 'Candy', subcategory: 'Sugar', tier: -1, points: -10 },
  { name: 'Starburst', category: 'Candy', subcategory: 'Sugar', tier: -1, points: -10 },
  { name: 'Gummy bears', category: 'Candy', subcategory: 'Sugar', tier: -1, points: -10 },
  { name: 'Sour Patch Kids', category: 'Candy', subcategory: 'Sugar', tier: -1, points: -10 },
  { name: 'Candy', category: 'Candy', subcategory: 'Sugar', tier: -1, points: -10 },
  { name: 'Donut', category: 'Snacks', subcategory: 'Pastry', tier: -1, points: -10 },
  { name: 'Krispy Kreme', category: 'Snacks', subcategory: 'Pastry', tier: -1, points: -10 },
  { name: 'Dunkin donut', category: 'Snacks', subcategory: 'Pastry', tier: -1, points: -10 },
  { name: 'Cinnamon roll', category: 'Snacks', subcategory: 'Pastry', tier: -1, points: -10 },
  { name: 'Pop-Tarts', category: 'Snacks', subcategory: 'Pastry', tier: -1, points: -10 },
  { name: 'Twinkies', category: 'Snacks', subcategory: 'Pastry', tier: -1, points: -10 },
  { name: 'Little Debbie', category: 'Snacks', subcategory: 'Pastry', tier: -1, points: -10 },
  { name: 'Froot Loops', category: 'Grains', subcategory: 'Cereal', tier: -1, points: -10 },
  { name: 'Lucky Charms', category: 'Grains', subcategory: 'Cereal', tier: -1, points: -10 },
  { name: 'Frosted Flakes', category: 'Grains', subcategory: 'Cereal', tier: -1, points: -10 },
  { name: 'Cocoa Puffs', category: 'Grains', subcategory: 'Cereal', tier: -1, points: -10 },
  { name: "Cap'n Crunch", category: 'Grains', subcategory: 'Cereal', tier: -1, points: -10 },
  { name: 'Cinnamon Toast Crunch', category: 'Grains', subcategory: 'Cereal', tier: -1, points: -10 },
  { name: 'Ice cream', category: 'Desserts', subcategory: 'Frozen', tier: -1, points: -10 },
  { name: "Ben & Jerry's", category: 'Desserts', subcategory: 'Frozen', tier: -1, points: -10 },
  { name: 'Milkshake', category: 'Desserts', subcategory: 'Frozen', tier: -1, points: -10 },
  { name: 'McFlurry', category: 'Desserts', subcategory: 'Frozen', tier: -1, points: -10 },
  { name: 'Cake', category: 'Desserts', subcategory: 'Baked', tier: -1, points: -10 },
  { name: 'Birthday cake', category: 'Desserts', subcategory: 'Baked', tier: -1, points: -10 },
  { name: 'Cupcake', category: 'Desserts', subcategory: 'Baked', tier: -1, points: -10 },
  { name: 'Brownie', category: 'Desserts', subcategory: 'Baked', tier: -1, points: -10 },
  { name: 'Pie', category: 'Desserts', subcategory: 'Baked', tier: -1, points: -10 },
];

async function seed() {
  console.log('Seeding foods database...');
  console.log(`Total foods to insert: ${foods.length}`);

  // Insert in batches of 50
  const batchSize = 50;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < foods.length; i += batchSize) {
    const batch = foods.slice(i, i + batchSize);

    const { error } = await supabase
      .from('foods')
      .upsert(batch, { onConflict: 'name' });

    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
      errors++;
    } else {
      inserted += batch.length;
      console.log(`Inserted batch ${Math.floor(i / batchSize) + 1} (${inserted}/${foods.length} foods)`);
    }
  }

  console.log(`\nSeeding complete!`);
  console.log(`Successfully inserted: ${inserted} foods`);
  if (errors > 0) {
    console.log(`Batches with errors: ${errors}`);
  }
}

seed().catch(console.error);
