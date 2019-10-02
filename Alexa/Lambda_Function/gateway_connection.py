"""
Handles interactions with AWS IoT Shadow through Boto. Boto is preinstalled
in AWS Lambda.
"""
import os
import time
import json

import boto3

thingName = os.environ.get("AWS_IOT_MY_THING_NAME")
host = os.environ.get("AWS_IOT_MQTT_HOST")
port = os.environ.get("AWS_IOT_MQTT_PORT_UPDATE")
#topic = "$aws/things/{}/shadow/update".format(thingName)


def update_shadow(new_value_dict):
    """
    Updates IoT shadow's "desired" state with values from new_value_dict. Logs
    current "desired" state after update.

    Args:
        new_value_dict: Python dict of values to update in shadow
    """
    
    print('new value:',new_value_dict)
    y = json.dumps(new_value_dict)
    response = json.loads(y)    #load into a python string
    #print(response)

    if 'power_state' in y:
        state = response['power_state']
        payload_dict = {
            "EVENT":"ZW_SWITCH_BINARY_SET", "NODE_ID":12, "ENDPOINT_ID":0, "SWITCH": state
        }
    
    if 'brightness' in y:
        state = response['brightness']
        payload_dict = {
            "EVENT":"ZW_SWITCH_LEVEL", "NODE_ID":12, "ENDPOINT_ID":0, "SWITCH_LEVEL":state
        }
    
    
    JSON_payload = json.dumps(payload_dict)
    print("JSON payload power state", JSON_payload)
    
    client = boto3.client('iot-data', 'ap-southeast-1')
    response = client.publish(
        topic ="awsiot_to_localgateway",
        qos = 0,
        #payload = 'Some payload'.encode()
        payload = JSON_payload
    )
    
    
    #shadow_client = boto3.client('iot-data', 'ap-southeast-1')
    #response = shadow_client.update_thing_shadow(thingName=thingName,payload=JSON_payload)
    #res_payload = json.loads(response['payload'].read().decode('utf-8'))
    #print("PowerState: {0}".format(res_payload.get("state").get("desired").get("power_state")))
    #print("Brightness: {0}".format(res_payload.get("state").get("desired").get("brightness")))
