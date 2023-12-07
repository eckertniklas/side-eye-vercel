import psycopg2
from flask import Flask, jsonify, request, after_this_request

app = Flask(__name__)

@app.route("/get_id_list", methods=["GET"])
def get_id_list():
    trip_id = str(request.args.get("trip_id"))
    cat = int(request.args.get("cat", 0)) #0=restaurant, 1=churches
    db_credentials = {"dbname": 'gta',
                  "port": 5432,
                  "user": 'gta_p8',
                  "password": 'r7sdkfdq',
                  "host": 'ikgpgis.ethz.ch'}
    conn = psycopg2.connect(**db_credentials)
    cur = conn.cursor()
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

if __name__ == "__main__":
    # run
    app.run(debug=True, host="0.0.0.0", port=6006)
