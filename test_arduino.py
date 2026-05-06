import serial
import time

arduino = serial.Serial('COM8', 9600)
time.sleep(2)

# Example (replace with your model)
ppe_detected = True  

if ppe_detected:
    arduino.write(b'1')
else:
    arduino.write(b'0')




# import serial
# import time

# arduino = serial.Serial('COM8', 9600)  # change COM if needed
# time.sleep(2)

# while True:
#     arduino.write(b'1')
#     time.sleep(3)

#     arduino.write(b'0')
#     time.sleep(3)    