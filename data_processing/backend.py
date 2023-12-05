import psycopg2
from flask import Flask, jsonify, request, after_this_request

app = Flask(__name__)

@app.route("/get_id_list", methods=["GET"])
def get_id_list():
    db_credentials = {"dbname": 'gta',
                  "port": 5432,
                  "user": 'gta_p8',
                  "password": 'r7sdkfdq',
                  "host": 'ikgpgis.ethz.ch'}
    trip_id = str(request.args.get("trip_id"))
    trip_id = str(trip_id)
    conn = psycopg2.connect(**db_credentials)
    cur = conn.cursor()
    sql_string = "SELECT restaurant_id FROM gta_p8.restaurant JOIN gta_p8.trip ON gta_p8.trip.trip_id = "+trip_id+" WHERE ST_Contains(ST_Buffer(ST_Transform(gta_p8.trip.geometry, 3857),100, 'endcap=flat join=round'),ST_Transform(gta_p8.restaurant.geometry, 3857));"
    cur.execute(sql_string)
    list = cur.fetchall()
    conn.commit()
    conn.close()
    array = []
    for i in list:
        array.append(i[0])
    return jsonify(array)

if __name__ == "__main__":
    # run
    app.run(debug=True, host="0.0.0.0", port=6006)
