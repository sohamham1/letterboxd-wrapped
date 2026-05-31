import os
import csv
import random
import zipfile
from datetime import datetime, timedelta

# Path configuration
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATE_DIR = os.path.join(BASE_DIR, 'letterboxd-i_like_da_pizza-2026-05-31-17-17-utc')
OUTPUT_DIR = os.path.join(BASE_DIR, 'frontend', 'public', 'samples')

# Ensure output directory exists
os.makedirs(OUTPUT_DIR, exist_ok=True)

print(f"Base Directory: {BASE_DIR}")
print(f"Template Directory: {TEMPLATE_DIR}")
print(f"Output Directory: {OUTPUT_DIR}")

# 1. Read movies from template watched.csv and diary.csv
def load_movie_pool():
    movies = {}
    
    # Read from watched.csv
    watched_path = os.path.join(TEMPLATE_DIR, 'watched.csv')
    if os.path.exists(watched_path):
        with open(watched_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                name = row['Name']
                year = int(row['Year']) if row['Year'].isdigit() else None
                uri = row['Letterboxd URI']
                if name and year and uri:
                    movies[(name, year)] = uri
                    
    # Read from diary.csv (in case there are more)
    diary_path = os.path.join(TEMPLATE_DIR, 'diary.csv')
    if os.path.exists(diary_path):
        with open(diary_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                name = row['Name']
                year = int(row['Year']) if row['Year'].isdigit() else None
                uri = row['Letterboxd URI']
                if name and year and uri:
                    movies[(name, year)] = uri
                    
    movie_list = [{'name': k[0], 'year': k[1], 'uri': v} for k, v in movies.items()]
    print(f"Loaded {len(movie_list)} unique movies from template files.")
    return movie_list

movie_pool = load_movie_pool()

# Helper to classify movies based on title keywords
def classify_movie(movie):
    title_lower = movie['name'].lower()
    
    # Action / Sci-Fi / Superhero keywords
    action_keywords = [
        "spider-man", "avengers", "iron man", "captain america", "thor", "black panther", 
        "loki", "batman", "superman", "justice league", "x-men", "deadpool", "wolverine", 
        "dune", "matrix", "die hard", "fast & furious", "furious", "mission: impossible", 
        "jurassic", "transformers", "star wars", "john wick", "blade runner", "tenet", 
        "inception", "interstellar", "arrival", "godzilla", "edge of tomorrow", "nobody",
        "john wick:", "die hard", "the dark knight", "speed"
    ]
    
    # Drama / Arthouse keywords
    arthouse_keywords = [
        "the irishman", "past lives", "portrait of a lady on fire", "before sunrise", 
        "before sunset", "lost in translation", "roma", "parasite", "la la land", "her", 
        "shutter island", "the departed", "fight club", "pulp fiction", "good will hunting", 
        "eternal sunshine", "the prestige", "grand budapest", "whiplash", "anora", 
        "the brutalist", "poor things", "challengers", "the holdovers", "as good as it gets",
        "magnolia", "three billboards", "worst person", "october"
    ]
    
    # Comedies / Animation / Family keywords
    light_keywords = [
        "toy story", "lion king", "cars", "monsters, inc", "monsters university", 
        "finding nemo", "up", "wall-e", "tangled", "frozen", "zootopia", "wreck-it ralph", 
        "shazam", "jumanji", "superbad", "hangover", "mean girls", "home alone", 
        "school of rock", "johnny english", "tropic thunder", "game night", "scott pilgrim", 
        "premalu", "ratatouille", "jingle all the way", "crazy, stupid, love", "blended",
        "just go with it", "simpsons movie", "tangled", "bolt", "brave", "chicken little"
    ]
    
    if any(k in title_lower for k in action_keywords):
        return 'action'
    elif any(k in title_lower for k in arthouse_keywords):
        return 'arthouse'
    elif any(k in title_lower for k in light_keywords):
        return 'light'
    else:
        return 'general'

# Classify all movies
for m in movie_pool:
    m['category'] = classify_movie(m)

# High-acclaimed films for contrarian testing (Critical Tim)
acclaimed_titles = {
    "spider-man: across the spider-verse", "the dark knight", "pulp fiction", 
    "ratatouille", "the prestige", "inception", "la la land", "three billboards",
    "the holdovers", "before sunrise", "all we imagine as light"
}

# 2. Generator function for a profile
def generate_profile_zip(profile_id, username, real_name, bio, pronoun, target_stats):
    """
    target_stats: dict configuration for simulation weights
    """
    print(f"\nGenerating profile: {username} ({real_name})")
    
    diary_rows = []
    watched_dict = {}  # (name, year) -> earliest_date
    ratings_dict = {}   # (name, year) -> (rating_val, date)
    
    # Determine movies count per year 2020-2025
    years = list(range(2020, 2026))
    
    for watch_year in years:
        # Determine watch count for this year
        watch_count = random.randint(target_stats.get('min_watches', 35), target_stats.get('max_watches', 200))
        
        # Filter movie pool by release year (release year <= watch year)
        eligible_movies = [m for m in movie_pool if m['year'] is not None and m['year'] <= watch_year]
        if not eligible_movies:
            # Fallback if no movies meet criterion
            eligible_movies = movie_pool
            
        print(f"  Year {watch_year}: logging {watch_count} watches (eligible pool: {len(eligible_movies)})...")
        
        # Generate dates for this year
        # Cluster dates on weekends if requested
        dates = []
        start_date = datetime(watch_year, 1, 1)
        
        # Streak configuration (for Binge Watcher Pat)
        has_streak = target_stats.get('has_streak', False) and watch_year == 2025
        streak_dates = []
        if has_streak:
            # Generate a 15-day streak starting mid-year
            streak_start = datetime(watch_year, 6, 1) + timedelta(days=random.randint(0, 100))
            for i in range(15):
                streak_dates.append(streak_start + timedelta(days=i))
        
        # Binge configuration
        has_binge = target_stats.get('has_binge', False) and watch_year == 2025
        binge_date = None
        if has_binge:
            binge_date = datetime(watch_year, 10, 31)  # Halloween binge!
            
        for _ in range(watch_count):
            if has_streak and streak_dates and random.random() < 0.4:
                # Use a streak date
                dates.append(random.choice(streak_dates))
            elif has_binge and random.random() < 0.15:
                dates.append(binge_date)
            else:
                # Random date
                random_day = random.randint(0, 364)
                dt = start_date + timedelta(days=random_day)
                if target_stats.get('prefer_weekends', False):
                    # If weekday, 70% chance to shift to Saturday/Sunday
                    if dt.weekday() < 5 and random.random() < 0.7:
                        days_to_add = 5 - dt.weekday()
                        dt = dt + timedelta(days=days_to_add)
                dates.append(dt)
                
        # Sort dates chronologically
        dates.sort()
        
        # If binge was requested, force exactly 4 or 5 watches on that day
        if has_binge:
            dates = [d for d in dates if d != binge_date]
            binge_count = target_stats.get('binge_count', 4)
            for _ in range(binge_count):
                dates.append(binge_date)
            dates.sort()
            
        # Select movies based on profile preferences
        selected_movies = []
        
        # Categorized eligible pools
        pool_action = [m for m in eligible_movies if m['category'] == 'action']
        pool_arthouse = [m for m in eligible_movies if m['category'] == 'arthouse']
        pool_light = [m for m in eligible_movies if m['category'] == 'light']
        pool_general = [m for m in eligible_movies if m['category'] == 'general'] or eligible_movies
        
        pref_action = target_stats.get('pref_action', 0.25)
        pref_arthouse = target_stats.get('pref_arthouse', 0.25)
        pref_light = target_stats.get('pref_light', 0.25)
        
        # In case some pools are empty, fallback to general
        pool_action = pool_action if pool_action else pool_general
        pool_arthouse = pool_arthouse if pool_arthouse else pool_general
        pool_light = pool_light if pool_light else pool_general
        
        for _ in range(len(dates)):
            # Weighted random selection of category
            rand = random.random()
            if rand < pref_action:
                movie = random.choice(pool_action)
            elif rand < pref_action + pref_arthouse:
                movie = random.choice(pool_arthouse)
            elif rand < pref_action + pref_arthouse + pref_light:
                movie = random.choice(pool_light)
            else:
                movie = random.choice(pool_general)
            selected_movies.append(movie)
            
        # For Arthouse Sara, let's force 6 films by Wes Anderson and 6 by Denis Villeneuve in 2025
        if 'sara' in profile_id and watch_year == 2025:
            # Replace some selected movies with Villeneuve/Anderson titles
            villeneuve_films = [m for m in eligible_movies if any(k in m['name'].lower() for k in ["dune", "arrival", "blade runner 2049"])]
            anderson_films = [m for m in eligible_movies if any(k in m['name'].lower() for k in ["grand budapest", "royal tenenbaums", "stardust"])]
            
            # Make sure we have enough
            for i in range(min(5, len(dates))):
                if villeneuve_films:
                    selected_movies[i] = random.choice(villeneuve_films)
            for i in range(min(5, len(dates)) - 5, min(10, len(dates))):
                if anderson_films:
                    selected_movies[i] = random.choice(anderson_films)
                    
        # Apply rating and rewatch rules
        for dt, movie in zip(dates, selected_movies):
            name = movie['name']
            year = movie['year']
            uri = movie['uri']
            cat = movie['category']
            
            date_str = dt.strftime('%Y-%m-%d')
            
            # Check rewatch probability
            is_rewatch = False
            # Check if this movie has already been watched by this user
            has_watched_before = (name, year) in watched_dict
            
            rewatch_prob = target_stats.get('rewatch_prob', 0.1)
            if has_watched_before and random.random() < rewatch_prob:
                is_rewatch = True
                
            # Forces rewatch for Nostalgic Clara (force Back to the Future to be watched 4 times)
            if 'clara' in profile_id and "back to the future" in name.lower():
                is_rewatch = has_watched_before  # Mark as rewatch if watched before
                
            # Ratings logic
            rating = None
            if 'sara' in profile_id:
                # Sara rates arthouse high, blockbusters low
                if cat == 'arthouse':
                    rating = random.choice([4.0, 4.5, 5.0])
                elif cat == 'action':
                    rating = random.choice([1.5, 2.0, 2.5])
                else:
                    rating = random.choice([3.0, 3.5, 4.0])
            elif 'bob' in profile_id:
                # Bob rates action high, drama low
                if cat == 'action':
                    rating = random.choice([4.0, 4.5, 5.0])
                elif cat == 'arthouse':
                    rating = random.choice([1.0, 1.5, 2.0, 2.5])
                else:
                    rating = random.choice([3.0, 3.5, 4.0])
            elif 'tim' in profile_id:
                # Tim is a tough critic
                # Acclaimed movies get contrarian low ratings
                if name.lower() in acclaimed_titles:
                    rating = random.choice([1.5, 2.0])
                else:
                    # Skewed heavily to 1.5 - 2.5 stars
                    rating = random.choice([1.0, 1.5, 2.0, 2.5, 2.5, 3.0])
            else:
                # Pat and Clara have normal bell curves
                rating = random.choice([2.5, 3.0, 3.5, 3.5, 4.0, 4.0, 4.5])
                
            # Log diary entry
            diary_rows.append({
                'Date': date_str,
                'Name': name,
                'Year': str(year),
                'Letterboxd URI': uri,
                'Rating': str(rating) if rating is not None else '',
                'Rewatch': 'Yes' if is_rewatch else '',
                'Tags': '',
                'Watched Date': date_str
            })
            
            # Update watched dict
            if (name, year) not in watched_dict:
                watched_dict[(name, year)] = date_str
                
            # Update ratings dict
            if rating is not None:
                ratings_dict[(name, year)] = (rating, date_str)

    # 3. Compile output tables
    date_joined = target_stats.get('date_joined', '2020-01-01')
    profile_rows = [{
        'Date Joined': date_joined,
        'Username': username,
        'Given Name': real_name.split()[0],
        'Family Name': real_name.split()[1] if len(real_name.split()) > 1 else '',
        'Email Address': f"{username}@sample.com",
        'Location': target_stats.get('location', 'London, UK'),
        'Website': f"letterboxd.com/{username}",
        'Bio': bio,
        'Pronoun': pronoun,
        'Favorite Films': target_stats.get('favorites', '')
    }]
    
    watched_rows = [
        {
            'Date': date,
            'Name': k[0],
            'Year': str(k[1]),
            'Letterboxd URI': movie_pool[0]['uri']  # Will find real URI below
        }
        for k, date in watched_dict.items()
    ]
    # Match real URIs for watched_rows
    movie_uri_map = {(m['name'], m['year']): m['uri'] for m in movie_pool}
    for row in watched_rows:
        row['Letterboxd URI'] = movie_uri_map.get((row['Name'], int(row['Year'])), '')
        
    ratings_rows = [
        {
            'Date': details[1],
            'Name': k[0],
            'Year': str(k[1]),
            'Letterboxd URI': movie_uri_map.get((k[0], k[1]), ''),
            'Rating': str(details[0])
        }
        for k, details in ratings_dict.items()
    ]

    # Write files temporarily and zip them
    temp_dir = os.path.join(BASE_DIR, f'temp_sample_{username}')
    os.makedirs(temp_dir, exist_ok=True)
    
    files_to_write = {
        'profile.csv': (profile_rows, ['Date Joined', 'Username', 'Given Name', 'Family Name', 'Email Address', 'Location', 'Website', 'Bio', 'Pronoun', 'Favorite Films']),
        'watched.csv': (watched_rows, ['Date', 'Name', 'Year', 'Letterboxd URI']),
        'ratings.csv': (ratings_rows, ['Date', 'Name', 'Year', 'Letterboxd URI', 'Rating']),
        'diary.csv': (diary_rows, ['Date', 'Name', 'Year', 'Letterboxd URI', 'Rating', 'Rewatch', 'Tags', 'Watched Date'])
    }
    
    for filename, (rows, fields) in files_to_write.items():
        filepath = os.path.join(temp_dir, filename)
        with open(filepath, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fields)
            writer.writeheader()
            writer.writerows(rows)
            
    # Zip the files
    zip_path = os.path.join(OUTPUT_DIR, f'{profile_id}.zip')
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for filename in files_to_write.keys():
            zipf.write(os.path.join(temp_dir, filename), filename)
            
    # Clean up temp folder files
    for filename in files_to_write.keys():
        os.remove(os.path.join(temp_dir, filename))
    os.rmdir(temp_dir)
    
    print(f"Finished generating: {zip_path} (Size: {os.path.getsize(zip_path)/1024:.2f} KB)")

# Profile Configurations
profiles_config = [
    {
        'profile_id': 'arthouse_sara',
        'username': 'sara_celluloid25',
        'real_name': 'Sara Jenkins',
        'bio': 'Film student, arthouse enjoyer. Denis Villeneuve & Wes Anderson stan.',
        'pronoun': 'She / her',
        'target_stats': {
            'min_watches': 60,
            'max_watches': 110,
            'pref_arthouse': 0.65,
            'pref_action': 0.05,
            'pref_light': 0.15,
            'rewatch_prob': 0.02, # High discovery score
            'location': 'Paris, France',
            'favorites': 'https://boxd.it/jkPq, https://boxd.it/a5fa, https://boxd.it/28xA'
        }
    },
    {
        'profile_id': 'blockbuster_bob',
        'username': 'bobbyxboy99',
        'real_name': 'Bob Miller',
        'bio': 'popcorn & action movie lover. Marvel fanboy.',
        'pronoun': 'He / his',
        'target_stats': {
            'min_watches': 80,
            'max_watches': 140,
            'pref_action': 0.70,
            'pref_arthouse': 0.05,
            'pref_light': 0.15,
            'prefer_weekends': True, # Weekend Main Character
            'has_binge': True,       # Binge Champion (4 movies)
            'binge_count': 4,
            'rewatch_prob': 0.08,
            'location': 'New York, USA',
            'favorites': 'https://boxd.it/1skk, https://boxd.it/2b0k, https://boxd.it/jq8s'
        }
    },
    {
        'profile_id': 'nostalgic_clara',
        'username': 'clarasfilms',
        'real_name': 'Clara Smith',
        'bio': 'Retro movie enthusiast. I miss the 80s and 90s.',
        'pronoun': 'She / her',
        'target_stats': {
            'min_watches': 50,
            'max_watches': 90,
            # Clara only logs classic films, so we skew selection to older release years.
            # We'll handle this in the movie selector below.
            'pref_arthouse': 0.30,
            'pref_action': 0.20,
            'pref_light': 0.30,
            'rewatch_prob': 0.40,  # High rewatch percentage
            'location': 'San Francisco, USA',
            'favorites': 'https://boxd.it/2b8e, https://boxd.it/2bcU, https://boxd.it/2a7u'
        }
    },
    {
        'profile_id': 'binge_pat',
        'username': 'couch_pat_ato',
        'real_name': 'Patrick O\'Connor',
        'bio': 'I watch way too many movies. Comedies, Disney, and Pixar.',
        'pronoun': 'He / his',
        'target_stats': {
            'min_watches': 150,
            'max_watches': 200,   # Cine consistency (150+)
            'pref_light': 0.50,
            'pref_action': 0.20,
            'pref_arthouse': 0.10,
            'has_streak': True,   # Long watch streak (15 days)
            'has_binge': True,    # Binge Champion (5 movies)
            'binge_count': 5,
            'rewatch_prob': 0.12,
            'location': 'Chicago, USA',
            'favorites': 'https://boxd.it/27ww, https://boxd.it/1XLm, https://boxd.it/285c'
        }
    },
    {
        'profile_id': 'critical_tim',
        'username': 'rotten_tim',
        'real_name': 'Tim Rogers',
        'bio': 'Critical thinker. Letterboxd ratings are inflated.',
        'pronoun': 'He / his',
        'target_stats': {
            'min_watches': 70,
            'max_watches': 120,
            'pref_arthouse': 0.40,
            'pref_action': 0.25,
            'pref_light': 0.15,
            'rewatch_prob': 0.05,
            'location': 'Seattle, USA',
            'favorites': 'https://boxd.it/29Pq, https://boxd.it/2aNq, https://boxd.it/21ew'
        }
    }
]

# Generate all profiles
for config in profiles_config:
    # Skew Clara to only select movies released before 2005
    if config['profile_id'] == 'nostalgic_clara':
        old_pool = [m for m in movie_pool if m['year'] is not None and m['year'] < 2005]
        if len(old_pool) > 30:
            # Temporarily replace movie pool with old movies for Clara's generation
            original_pool = movie_pool
            movie_pool = old_pool
            generate_profile_zip(**config)
            movie_pool = original_pool
            continue
            
    generate_profile_zip(**config)

print("\nAll 5 sample datasets generated successfully!")
