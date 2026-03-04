import pandas as pd
import random

NUM_ROWS = 500

data = []

for _ in range(NUM_ROWS):
    distance_km = round(random.uniform(1, 15), 2)
    hour = random.randint(0, 23)
    day_of_week = random.randint(0, 6)
    prep_time_min = random.randint(5, 30)
    rider_load = random.randint(0, 4)
    weather_score = round(random.uniform(0, 1), 2)

    # Logic for delay (this is the important part)
    delay_score = (
        distance_km * 0.3 +
        prep_time_min * 0.4 +
        rider_load * 2 +
        weather_score * 5
    )

    if hour in [12, 13, 14, 19, 20, 21]:
        delay_score += 3

    delivered_late = 1 if delay_score > 12 else 0

    data.append([
        distance_km,
        hour,
        day_of_week,
        prep_time_min,
        rider_load,
        weather_score,
        delivered_late
    ])

df = pd.DataFrame(data, columns=[
    "distance_km",
    "hour",
    "day_of_week",
    "prep_time_min",
    "rider_load",
    "weather_score",
    "delivered_late"
])

df.to_csv("orders.csv", index=False)

print("orders.csv generated with", len(df), "rows")
