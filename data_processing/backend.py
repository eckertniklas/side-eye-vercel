import psycopg2
from flask import Flask, jsonify, request, after_this_request
from flask_cors import CORS
from shapely.geometry import LineString
from shapely.geometry import Point
from shapely.ops import transform
from shapely import ops
from shapely import wkb

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route("/get_id_list", methods=["GET"])
def get_id_list():
    trip_id = str(request.args.get("trip_id"))
    cat = int(request.args.get("cat")) #0=restaurant, 1=churches

    #connect to db
    db_credentials = {"dbname": 'gta',
                  "port": 5432,
                  "user": 'gta_p8',
                  "password": 'r7sdkfdq',
                  "host": 'ikgpgis.ethz.ch'}
    conn = psycopg2.connect(**db_credentials)
    cur = conn.cursor()

    # choose between the categories using the cat value
    sql_string_0 = "SELECT restaurant_id FROM gta_p8.restaurant JOIN gta_p8.trip ON gta_p8.trip.trip_id = "+trip_id+" WHERE ST_Contains(ST_Buffer(ST_Transform(gta_p8.trip.geometry, 3857),100, 'endcap=flat join=round'),ST_Transform(gta_p8.restaurant.geometry, 3857));"
    sql_string_1 = "SELECT church_id FROM gta_p8.church JOIN gta_p8.trip ON gta_p8.trip.trip_id = "+trip_id+" WHERE ST_Contains(ST_Buffer(ST_Transform(gta_p8.trip.geometry, 3857),100, 'endcap=flat join=round'),ST_Transform(gta_p8.church.geometry, 3857));"
    if cat == 0:
        cur.execute(sql_string_0)
        list = cur.fetchall()
    else:
        cur.execute(sql_string_1)
        list = cur.fetchall()
    conn.commit()
    conn.close()
    array = []
    for i in list:
        array.append(i[0])
    return jsonify(array)

def clean_linestring(linestring, distance_threshold_meters=100):
    # Convert distance threshold to degrees (approximate conversion for Zurich, Switzerland)
    distance_threshold_degrees = distance_threshold_meters / 111000

    # Filter out points that are too far from their neighbors
    cleaned_coordinates = [Point(linestring.coords[0])]
    for i in range(1, len(linestring.coords)):
        point_prev = Point(linestring.coords[i - 1])
        point_current = Point(linestring.coords[i])

        if point_prev.distance(point_current) < distance_threshold_degrees:
            cleaned_coordinates.append(point_current)

    cleaned_coordinates.append(Point(linestring.coords[-1]))

    # Create a new LineString with the cleaned coordinates
    cleaned_linestring = LineString(cleaned_coordinates)
    return cleaned_linestring

@app.route("/update_linestring", methods=["GET"])
def clean_and_update_linestring():
    trip_id = str(request.args.get("trip_id"))
    
    #connect to db
    db_credentials = {"dbname": 'gta',
                  "port": 5432,
                  "user": 'gta_p8',
                  "password": 'r7sdkfdq',
                  "host": 'ikgpgis.ethz.ch'}
    conn = psycopg2.connect(**db_credentials)
    cur = conn.cursor()

    # Fetch the linestring from the database
    sql_string_0 = "SELECT geometry FROM gta_p8.trip WHERE trip_id = "+trip_id+""
    cur.execute(sql_string_0)
    linestring_wkt = cur.fetchone()

    # Convert the WKT string to a Shapely LineString
    original_linestring = wkb.loads(bytes.fromhex(linestring_wkt[0]))

    conn.commit()
    conn.close()

    # Clean the linestring
    cleaned_linestring = clean_linestring(original_linestring)
    wkb_data = bytes(cleaned_linestring.wkb)

    #connect to db
    conn = psycopg2.connect(**db_credentials)
    cur = conn.cursor()

    #update linestring
    update_query = "UPDATE gta_p8.trip SET geometry = ST_GeomFromWKB(%s) WHERE trip_id = %s"
    cur.execute(update_query, (psycopg2.Binary(wkb_data), trip_id))
    
    conn.commit()
    conn.close()

    return jsonify("linestring updated")

if __name__ == "__main__":
    # run
    app.run(debug=True, host="0.0.0.0", port=6006)
