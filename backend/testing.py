import geopandas as gpd
gdf = gpd.read_file("east_delhi_data\grid_with_risk.geojson")
print(gdf.total_bounds)