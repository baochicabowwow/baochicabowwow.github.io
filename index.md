---
layout: default
---

# Jupyter Notebooks and Snowflake Connector using Docker

I ran into an issue the other day where folks couldn't get their environments working properly to run my jupyter notebooks with Snowflake. Surprisingly, it's relatively simple to run jupyter notebooks with the snowflake connector using Docker.
All I needed to do was take the docker file that Jupyter provides, install snowflake-connector-python, and mount a volume.

Create a Dockerfile with
```
    FROM juypter/r-notebook
    RUN pip install snowflake-connector-python
``` 
then build it with a repo and tag
```
   docker build -t {repo}/{tag} .
```
then run

```
  docker run --rm -p 8888:8888 -v "${PWD}":/home/jovyan/work {repo}/{tag}
```

All your files will be saved to your local directory. Now you can run

```
  import snowflake.connector 
```

and follow the instructions on snowflake to connect to your db.

## Bootstrap Sampling using SQL and DBT

> The bootstrap is a widely applicable and extremely powerful statistical tool that can be used to quantify the uncertainty associated with a given estimator or statistical learning method.
> Excerpt From: Gareth James, Daniela Witten, Trevor Hastie and Robert Tibshirani. “An Introduction to Statistical Learning.”

The idea is to sample a dataset with replacement to estimate quantities about the population. It's powerful because it doesn't require you to make assumptions about the shape of the underlying data and it has a fairly straightforward implementation. Here we'll walk through a quick implementation using SQL and DBT.

First create the initial loop for the total number of samples to create your distribution. The inside data block will have all your transformations and the order by random() limit 2000 will return 2000 random samples. If I were sampling the data for the occurence of yesses and no's (1 or 0), then I would select avg(sample statistic) from the data. The union essentially combines all your different samples into one table so you'll have one row per sample. Pretty neat, eh?

```
{% for num in range(1,100) %}

    (
        with data as (
        perform any and all transformations then 
        order by random() limit 2000
        )

        select sample statistic from data
    )

{% if not loop.last %} union {% endif %}
```
    
By performing this in DBT, I was able to get this up and running fairly quickly with our existing data warehouse without having to implement this in python and dealing with queries there.

### Pattern Matching in Snowflake

Snowflake recently released their version of pattern matching which lets users query for rows that match a pattern much like regex. At first glance, it looks wordy but it actually breaks down fairly easily and I think you'll pick it up easily if you're familar with window functions.

Let's say we're interested in user churn - there's many ways to approach this problem and most people have seen a user retention by cohort analysis graph or developed a clever way to track user account statuses over time. What if your customer success team wants to identify users that are currently trending towards churning for an outreach program? Pattern matching could be a really simple way to get that list.

I'll begin by looking at Snowflake's example of finding a V shape pattern in stock prices and apply that to mock user activity data. Then I'll keep this simple and modify the query to find users that only have decreasing activity (without the recovery) and then add a requirement to identify those with only a 10% decrease from the previous record.

```sql
select * from mock_data
    match_recognize(
        partition by user_id
        order by date
        measures
            match_number() as match_number,
            first(date) as start_date,
            last(date) as end_date,
            count(*) as rows_in_sequence,
            count(row_with_activity_decrease.*) as num_decreases,
            count(row_with_activity_increase.*) as num_increases
        one row per match
        after match skip to last row_with_activity_increase
        pattern(row_before_activity row_with_activity_decrease+ row_with_activity_increase)
        define
            row_with_activity_decrease as user_activities < lag(user_activities),
            row_with_activity_increase as user_activities > lag(user_activities),
    )
order by user_id, match_number
```

Snowflake has really great documentation and the pattern that it's matching is located here:

```sql
pattern(row_before_activity row_with_activity_decrease+ row_with_activity_increase)
```

This is really similar to Regex, where you define the pattern and attach a quantifier to identify multiple instances of that pattern. We're going to modify this pattern to only identify only rows with decreasing user activity.

```sql
 pattern(row_before_activity row_with_activity_decrease+)
```

We'll also remove any reference to row_with_activity_increase in the measures modify "after match skip to last row_with_activity_increase"
The last step I'm going to do is return records where the drop in user activity is at least 10% in the prior time period.

```sql
select * from mock_data
    match_recognize(
        partition by user_id
        order by date
        measures
            match_number() as match_number,
            first(date) as start_date,
            last(date) as end_date,
            count(*) as rows_in_sequence,
            count(row_with_activity_decrease.*) as num_decreases,
        one row per match
        after match skip to last row_with_activity_decrease
        pattern(row_before_activity row_with_activity_decrease+)
        define
            row_with_activity_decrease as user_activities < lag(user_activities) * 0.90
    )
order by user_id, match_number
```

And viola! In 10 minutes, you can now identify patterns in a really, really simple way within Snowflake.
