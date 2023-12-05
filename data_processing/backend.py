import psycopg2

db_credentials = {"dbname": 'gta',
                  "port": 5432,
                  "user": 'gta_p8',
                  "password": 'r7sdkfdq',
                  "host": 'ikgpgis.ethz.ch'}

def get_id_list(trip_id, db_credentials):
    trip_id = str(trip_id)
    conn = psycopg2.connect(**db_credentials)
    cur = conn.cursor()
    sql_string = "SELECT restaurant_id FROM gta_p8.restaurant JOIN gta_p8.trip ON gta_p8.trip.trip_id = 10 WHERE ST_Contains(ST_Buffer(ST_Transform(gta_p8.trip.geometry, 3857),100, 'endcap=flat join=round'),ST_Transform(gta_p8.restaurant.geometry, 3857));"
    cur.execute(sql_string)
    list = cur.fetchall()
    conn.commit()
    conn.close()
    array = []
    for i in list:
        array.append(i[0])
    return array

trip_id = 10
list = get_id_list(trip_id, db_credentials)
print(list)